

let util = require('util');
const i2c = require('./i2c');

const errString = (code) => {
  switch (code) {
    case 0: return "";
    case 1: return "motor fault";
    case 2: return "i2c overflow";
    case 3: return "bad command data";
    case 4: return "command processing took too long";
    case 5: return "speed too fast for MCU";
    case 6: return "move out-of-bounds";
    case 7: return "move cmd when not homed";
  }
}
const motors = [
  // B1
  { name: 'Y', i2cAddr: 0x08, mcu:1, descr: 'Y-Axis' },
  // B4
  { name: 'R', i2cAddr: 0x10, mcu:2, descr: 'Rotation' },
  { name: 'Z', i2cAddr: 0x11, mcu:2, descr: 'Z-Axis' }, // s.b. E, temp until new board
  { name: 'X', i2cAddr: 0x12, mcu:2, descr: 'X-Axis' },
  { name: 'D', i2cAddr: 0x13, mcu:2, descr: 'none' },   // s.b. Z, temp until new board
  // U5
  { name: 'A', i2cAddr: 0x18, mcu:3, descr: 'Tool-A' },
  { name: 'B', i2cAddr: 0x19, mcu:3, descr: 'Tool-B' },
  { name: 'C', i2cAddr: 0x1a, mcu:3, descr: 'Tool-C' },
  { name: 'P', i2cAddr: 0x1b, mcu:3, descr: 'Paste' },
  { name: 'F', i2cAddr: 0x1c, mcu:3, descr: 'Focus' },
  // not really a motor
  { name: 'L', i2cAddr: 0x1d, mcu:3, descr: 'Leds' },
];

let defaultSettings = {
  // accel speeds (mm/sec/sec): 0, 200, 400, 600, 800, 1000, 1250, 1500
  // accel values: 0, 8000, 16000, 24000, 32000, 40000, 50000, 60000
  accel:             7, // acceleration code
  speed:          2000, // default speed
  inSpeed:         500, // start/stop speed limit (30 mm/sec)
  maxPos:        32000, // max pos is 800 mm
  homeSpeed:      1000, // homing speed (100 mm/sec)
  homeBkupSpeed:    60, // homing back-up speed (1.5 mm/sec)
  homeOfs:          40, // home offset distance: 1 mm
  homePosVal:        0, // home pos value, set cur pos to this after homing
  limitSw:           0, // limit sw control
  clkPeriod:        30, // period of clock in usecs (applies to all motors in mcu)
                     // lower value reduces stepping jitter, but may cause failure
};

let motorByName = {};
for (let [idx, motor] of motors.entries()) {
  motor.idx       = idx;
  motor.settings  = {...defaultSettings};
  motorByName[motor.name] = motor;
};

const chkState = async (name) => {
  const motor = motorByName[name];
  const addr = motor.i2cAddr;
  const recvBuf = await i2c.status(addr);
  if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
    throw (new Error('status checksum error'));
  }
  const stateByte = buf[0];
  let pos = ((buf[1] << 8) | buf[2]);
  if (pos > 32767) {
    pos -= 65536;
  }
  return {
    name:motor.name,
    vers: (stateByte >> 7),
    errStr: errString((stateByte & 0x70) >> 4),
    errFlag: (stateByte & 0x08) >> 3,
    busy: (stateByte & 0x04) >> 2,
    motorOn: (stateByte & 0x02) >> 1,
    homed: stateByte & 1,
    pos,
  };
}

let setOneByteCmd = (opcode) => {
  const cmdBuf = new ArrayBuffer(1);
  const opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  return cmdBuf;
}

let setCmdWord = (word) => {
  const cmdBuf = new ArrayBuffer(2);
  const wordView = new DataView(cmdBuf, 0, 2);
  wordView.setUint16(0, word);
  return cmdBuf;
}

let setCmdWords = (opcode, cmdData) => {
  const cmdBuf = new ArrayBuffer(1 + cmdData.length * 2);
  const opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  const wordsView = new DataView(cmdBuf, 1, cmdData.length * 2);
  for (const [ofs, word] of cmdData.entries()) {
    wordsView.setUint16(ofs * 2, word);
  }
  return cmdBuf;
}

const opcode = {
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

  try {
    let numSettingsToSend = 10;
    console.log(getTime(), '============ send settings ============');
    cmdBuf = setCmdWords(opcode.settings, [
    ]);
    await i2c.cmd(motorByName.X.i2cAddr, cmdBuf);
    await i2c.cmd(motorByName.B.i2cAddr, cmdBuf);

    console.log(getTime(), '============ send home-set ============');
    cmdBuf = setOneByteCmd(opcode.setHomePos);
    await i2c.cmd(motorByName.X.i2cAddr, cmdBuf);
    await i2c.cmd(motorByName.B.i2cAddr, cmdBuf);

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
      await i2c.cmd(motorByName[motorName].i2cAddr, cmdBuf);
    }

    // while ((await chkState(motor.R.idx)).busy ||
    //   (await chkState(motor.E.idx)).busy ||
    //   (await chkState(motor.X.idx)).busy);

    while ((await chkState(motorByName.X.idx, true)).busy);

    // console.log(getTime(), '============ softStop ============');
    // cmdBuf = setOpcode(opcode.softStopRst);
    // await i2c.cmd(motor.R.i2cAddr, cmdBuf);
    // await i2c.cmd(motor.E.i2cAddr, cmdBuf);
    // await i2c.cmd(motor.X.i2cAddr, cmdBuf);

    let status = await chkState(motorByName.X.idx, true);
    if (status.eb) {
      await chkState(motorByName.R.idx);
      await chkState(motorByName.Z.idx);
      await chkState(motorByName.X.idx);
      await chkState(motorByName.B.idx);
      await chkState(motorByName.R.idx);
      await chkState(motorByName.Z.idx);
      await chkState(motorByName.B.idx);
      await chkState(motorByName.X.idx);
    }

    status = await chkState(motorByName.B.idx, true);
    if (status.eb) {
      await chkState(motorByName.R.idx);
      await chkState(motorByName.Z.idx);
      await chkState(motorByName.X.idx);
      await chkState(motorByName.B.idx);
      await chkState(motorByName.R.idx);
      await chkState(motorByName.Z.idx);
      await chkState(motorByName.X.idx);
      await chkState(motorByName.B.idx);
    }

    await chkState(motorByName.X.idx);
    await chkState(motorByName.B.idx);

  } catch (e) {
    console.log('I2C test error:', e.message);
    await chkState(motorByName.X.idx);
    await chkState(motorByName.B.idx);
    await sleep(1000);
  }
}






}