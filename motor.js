
/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

let util = require('util');
const i2c = require('./i2c');
const sleep = util.promisify(setTimeout);

motors = [
  {name:'Y', i2cAddr: 0x08, descr: 'Y-Axis'},
];

let motor = {};
for (let [idx, m] of motors.entries()) { motor[m.name] = Object.assign(m,{idx})};

let stateByte;
let lastStateByte = -1;
let lastPos = 0;
let lastPosReported = 0;
let lastErrBit = -1;
let start = Date.now();
let lastTime = start;
let lastSpeed = 0;
let lastAccel = 0;

let getTime = () => ((Date.now() - start) / 1000).toFixed(2);

let chkState = async () => {
  let addr = motor.Y.i2cAddr;
  let parseState = (buf) => {
    stateByte = buf[0];
    let pos = ((buf[1] << 8) | buf[2]);
    if (pos > 32767) {
      pos -= 65536;
    }
    let now = Date.now();
    let elapsedSecs = (now - lastTime) / 1000;
    let speed = Math.round((pos - lastPos) / elapsedSecs);
    let accel = Math.round((speed - lastSpeed) / elapsedSecs);
    lastTime = now;
    lastPos = pos;
    lastSpeed = speed;
    lastAccel = accel;
    return {
      time: getTime(),
      // vers: (stateByte >> 7),
      err: errString((stateByte & 0x70) >> 4),
      errBit: (stateByte & 0x08) >> 3,
      busy: (stateByte & 0x04) >> 2,
      motOn: (stateByte & 0x02) >> 1,
      homed: stateByte & 1,
      pos,
      speed,
      accel,
    };
  }
  try {
    let recvBuf = await i2c.recv(addr);
    if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
      console.log('status read cksum error:', recvBuf);
      throw (new Error('cksum error'));
    }
    let state = parseState(recvBuf);
    if (lastStateByte != stateByte ||
        lastPosReported != state.pos ||
        lastErrBit != state.errBit) {
      console.log(state);
      console.log();
      lastStateByte = stateByte;
      lastPosReported = state.pos;
      lastErrBit = state.errBit;
    }
  } catch (e) {
    console.log('i2c status read error:', e.message);
  }
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
  speedMove: 0x4000,
  accelSpeedMove: 0x0800,
  startHoming: 0x10,
  getTestPos: 0x11,
  softStop: 0x12,
  softStopRst: 0x13,
  reset: 0x14,
  motorOn: 0x15,
  setHomePos: 0x16,
  settings: 0x1f,
};

setInterval(chkState, 20);

let path;

exports.test = async () => {
  let pwrSwOnOff = true;
  let addr = motor.Y.i2cAddr;
  let cmdBuf;
  path = [
    [12000, 1000],
    [12000, 1000],
  ];
  try {
    if (pwrSwOnOff) {
      let numSettingsToSend = 9;
      console.log(getTime(), '============ send settings ============');
      cmdBuf = setCmdWords(opcode.settings, [
        // accel speeds (mm/sec/sec): 0, 200, 400, 600, 800, 1000, 1250, 1500
        // accel values: 0, 8000, 16000, 24000, 32000, 40000, 50000, 60000
        5, // acceleration code
        4000, // default speed
        1200, // start/stop speed limit (30 mm/sec)
        32767, // max pos is 800 mm

        1000, // homing speed (100 mm/sec)
        60, // homing back-up speed (1.5 mm/sec)
        40, // home offset distance: 1 mm
        0, // home pos value, set cur pos to this after homing
        0, // limit sw control
      ]);
      await i2c.send(addr, cmdBuf);

      console.log(getTime(), '============ send home-set ============');
      cmdBuf = setOpcode(opcode.setHomePos);
      await i2c.send(addr, cmdBuf);

      for (let e of path) {
        let [tgt, delay] = e;
        console.log(getTime(), '============ move to', tgt, '============');
        cmdBuf = setCmdWord(opcode.move + tgt);
        await i2c.send(addr, cmdBuf);
        await sleep(delay);
      }
      console.log(getTime(), '============ reset ============');
      cmdBuf = setOpcode(opcode.reset);
      await i2c.send(addr, cmdBuf);

      while (true) { await sleep(10000) };
    }
  } catch (e) {
    chkState();
    console.log('I2C test error:', e.message);
    await sleep(100);
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