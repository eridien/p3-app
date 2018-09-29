
/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

let util = require('util');
const i2c = require('./i2c');
const sleep = util.promisify(setTimeout);

motors = [
  // B1
  { idx:  0, name: 'Y', i2cAddr: 0x08, descr: 'Y-Axis' },
  // B3
  { idx:  1, name: 'R', i2cAddr: 0x10, descr: 'Rotation' },
  { idx:  2, name: 'Z', i2cAddr: 0x11, descr: 'Z-Axis' }, // s.b. E, temp until new board
  { idx:  3, name: 'X', i2cAddr: 0x12, descr: 'X-Axis' },
  { idx:  4, name: 'D', i2cAddr: 0x13, descr: 'none' },   // s.b. Z, temp until new board
  // U6
  { idx:  5, name: 'A', i2cAddr: 0x18, descr: 'Tool-A' },
  { idx:  6, name: 'B', i2cAddr: 0x19, descr: 'Tool-B' },
  { idx:  7, name: 'C', i2cAddr: 0x1a, descr: 'Tool-C' },
  { idx:  8, name: 'P', i2cAddr: 0x1b, descr: 'Paste' },
  { idx:  9, name: 'F', i2cAddr: 0x1c, descr: 'Focus' },
  { idx: 10, name: 'L', i2cAddr: 0x1d, descr: 'Leds' },
];

let motor = {};
for (let [idx, m] of motors.entries()) { motor[m.name] = Object.assign(m,{idx})};

let stateByte;
let lastStateByte = [0, 0, 0];
let lastPos = [0,0,0];
let lastPosReported = [0, 0, 0];
let lastErrBit = [-1,-1,-1];
let start = Date.now();
let lastTime = [start, start, start];
let lastSpeed = [0, 0, 0];
let lastAccel = [0, 0, 0];

let getTime = () => ((Date.now() - start) / 1000).toFixed(2);

let chkState = async (motIdx, dontPrint) => {
  let mot = motors[motIdx];
  let addr = mot.i2cAddr;
  let parseState = (buf) => {
    stateByte = buf[0];
    let pos = ((buf[1] << 8) | buf[2]);
    if (pos > 32767) {
      pos -= 65536;
    }
    let now = Date.now();
    let elapsedSecs = (now - lastTime[motIdx]) / 1000;
    let speed = Math.round((pos - lastPos[motIdx]) / elapsedSecs);
    let accel = Math.round((speed - lastSpeed[motIdx]) / elapsedSecs);
    lastTime[motIdx] = now;
    lastPos[motIdx] = pos;
    lastSpeed[motIdx] = speed;
    lastAccel[motIdx] = accel;
    return {
      mot:mot.name,
      t: getTime(),
      // vers: (stateByte >> 7),
      e: errString((stateByte & 0x70) >> 4),
      eb: (stateByte & 0x08) >> 3,
      busy: (stateByte & 0x04) >> 2,
      m: (stateByte & 0x02) >> 1,
      h: stateByte & 1,
      pos,
      s:speed,
      // accel,
    };
  }
  let state;
  try {
    let recvBuf = await i2c.status(addr);
    if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
      console.log('status read cksum error:', recvBuf);
      throw (new Error('cksum error'));
    }
    state = parseState(recvBuf);
    if (true || 
        lastStateByte[motIdx]   != stateByte ||
        lastPosReported[motIdx] != state.pos ||
        lastErrBit[motIdx]      != state.errBit) {
      if (state.eb || !dontPrint) 
        console.log(util.inspect(state).replace(/\s/g, ''));
      lastStateByte[motIdx]   = stateByte;
      lastPosReported[motIdx] = state.pos;
      lastErrBit[motIdx]      = state.errBit;
    }
  } catch (e) {
    console.log('i2c status read error:', e.message);
  }
  return state;
}

let setOpcode = (opcode) => {
  let cmdBuf = new ArrayBuffer(1);
  let opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  return cmdBuf;
}

let setCmdWord = (word) => {
  let cmdBuf = new ArrayBuffer(2);
  let wordView = new DataView(cmdBuf, 0, 2);
  wordView.setUint16(0, word);
  return cmdBuf;
}

let setCmdWords = (opcode, cmdData) => {
  let cmdBuf = new ArrayBuffer(1 + cmdData.length * 2);
  let opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  let wordsView = new DataView(cmdBuf, 1, cmdData.length * 2);
  for (const [ofs, word] of cmdData.entries()) {
    wordsView.setUint16(ofs * 2, word);
  }
  return cmdBuf;
}

let opcode = {
  move: 0x8000,
  speedMove: 0x40,
  accelSpeedMove: 0x08,
  startHoming: 0x10,
  getTestPos: 0x11,
  softStop: 0x12,
  softStopRst: 0x13,
  reset: 0x14,
  motorOn: 0x15,
  setHomePos: 0x16,
  settings: 0x1f,
};

// setInterval(chkState, 20);

let testCmds;

exports.test = async () => {
  let cmdBuf;
  testCmds = [
    // motor, pos, post-delay, speed, accel (-1 means use settings)
    // ['R', 30000, -1, -1],  // fault input is broken
    // ['E', 30000, -1, -1],  // fault input is broken
    ['X', 30000, -1, -1],
    // ['A', 30000, -1, -1], // motor A driver is broken
    ['B', 30000, -1, -1],
  ];
  try {
    await chkState(motor.X.idx);
    await chkState(motor.B.idx);

    let numSettingsToSend = 10;
    console.log(getTime(), '============ send settings ============');
    cmdBuf = setCmdWords(opcode.settings, [
      // accel speeds (mm/sec/sec): 0, 200, 400, 600, 800, 1000, 1250, 1500
      // accel values: 0, 8000, 16000, 24000, 32000, 40000, 50000, 60000
      7, // acceleration code
      2000, // default speed
      500, // start/stop speed limit (30 mm/sec)
      32767, // max pos is 800 mm
      1000, // homing speed (100 mm/sec)
      60,   // homing back-up speed (1.5 mm/sec)
      40,   // home offset distance: 1 mm
      0,    // home pos value, set cur pos to this after homing
      0,    // limit sw control
      30,   // period of clock in usecs (applies to all motors in mcu)
            // lower value reduces stepping jitter, but may cause failure
    ]);
    await i2c.cmd(motor.X.i2cAddr, cmdBuf);
    await i2c.cmd(motor.B.i2cAddr, cmdBuf);

    console.log(getTime(), '============ send home-set ============');
    cmdBuf = setOpcode(opcode.setHomePos);
    await i2c.cmd(motor.X.i2cAddr, cmdBuf);
    await i2c.cmd(motor.B.i2cAddr, cmdBuf);

    for (let e of testCmds) {
      let [motorName, tgt, speed, accel] = e;
      if (speed == -1 && accel == -1) {
        console.log(getTime(), '============ move to', tgt, '============');
        cmdBuf = setCmdWord(opcode.move + tgt);
      }
      else if (accel == -1) {
        console.log(getTime(), '============ speed-move to', tgt,
                               'at speed', ((speed >> 8) & 0x3f) * 256, '============');
        cmdBuf = setCmdWords(opcode.speedMove + ((speed >> 8) & 0x3f), [tgt]);
      }
      else {
        console.log(getTime(), '============ accel-speed-move to', tgt, 
                               'at speed', ((speed >> 8) & 0x3f)*256, 
                               'and accel', accel, '============');
        cmdBuf = setCmdWords(opcode.accelSpeedMove + accel, [speed, tgt]);
      }
      await i2c.cmd(motor[motorName].i2cAddr, cmdBuf);
    }

    // while ((await chkState(motor.R.idx)).busy ||
    //   (await chkState(motor.E.idx)).busy ||
    //   (await chkState(motor.X.idx)).busy);

    while ((await chkState(motor.X.idx, true)).busy);

    // console.log(getTime(), '============ softStop ============');
    // cmdBuf = setOpcode(opcode.softStopRst);
    // await i2c.cmd(motor.R.i2cAddr, cmdBuf);
    // await i2c.cmd(motor.E.i2cAddr, cmdBuf);
    // await i2c.cmd(motor.X.i2cAddr, cmdBuf);

    let status = await chkState(motor.X.idx, true);
    if (status.eb) {
      await chkState(motor.R.idx);
      await chkState(motor.Z.idx);
      await chkState(motor.X.idx);
      await chkState(motor.B.idx);
      await chkState(motor.R.idx);
      await chkState(motor.Z.idx);
      await chkState(motor.B.idx);
      await chkState(motor.X.idx);
    }

    status = await chkState(motor.B.idx, true);
    if (status.eb) {
      await chkState(motor.R.idx);
      await chkState(motor.Z.idx);
      await chkState(motor.X.idx);
      await chkState(motor.B.idx);
      await chkState(motor.R.idx);
      await chkState(motor.Z.idx);
      await chkState(motor.X.idx);
      await chkState(motor.B.idx);
    }

    await chkState(motor.X.idx);
    await chkState(motor.B.idx);

  } catch (e) {
    console.log('I2C test error:', e.message);
    await chkState(motor.X.idx);
    await chkState(motor.B.idx);
    await sleep(1000);
  }
}






errString = (code) => {
  switch (code) {
    case 0: return "";
    case 1: return "motor fault";
    case 2: return "i2c overflow";
    case 3: return "bad command data (first byte invalid or length wrong)";
    case 4: return "command processing took too long";
    case 5: return "speed too fast for MCU";
    case 6: return "move out-of-bounds";
    case 7: return "move cmd when not homed";
  }
}