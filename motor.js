

const util = require('util');
const i2c  = require('./i2c');

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
];

const defSettings = [
  // accel values by 0..7 index: 0, 8000, 16000, 24000, 32000, 40000, 50000, 60000
  // accel in mm/sec/sec:        0,  200,   400,   600,   800,  1000,  1250,  1500
  ['accel',             7], // acceleration code -- max
  ['speed',          2000], // default speed\', 50 mm/sec
  ['pullInSpeed',     500], // start/stop pull-in speed -- 12.5 mm/sec
  ['maxPos',        32000], // max pos is 800 mm
  ['homeSpeed',      1000], // homing speed (25 mm/sec)
  ['homeBkupSpeed',    60], // homing back-up speed (1.5 mm/sec)
  ['homeOfs',          40], // home offset distance, 1 mm
  ['homePosVal',        0], // home pos value, set pos to this after homing
  ['limitSw',           0], // limit switch control
  ['clkPeriod',        30], // period of clock in usecs (applies to all motors in mcu)
                          // lower value reduces stepping jitter, but may cause errors
];

const settingsKeys = [];
defSettings.forEach( (keyVal) => {
  settingsKeys.push(keyVal[0]);
});

const motorByName = {};
motors.forEach( (motor, idx) => {
  motor.idx       = idx;
  motor.settings  = {};
  defSettings.forEach( (keyVal) => {
    motor.settings[keyVal[0]] = keyVal[1];
  });
  motorByName[motor.name] = motor;
});

const opcode = {
  move:         0x8000,
  speedMove:      0x40,
  accelSpeedMove: 0x08,
  startHoming:    0x10,
  getTestPos:     0x11,
  softStop:       0x12,
  softStopRst:    0x13,
  reset:          0x14,
  motorOn:        0x15,
  setHomePos:     0x16,
  settings:       0x1f,
};

const motorByNameOrIdx = (nameOrIdx) =>
  (typeof nameOrIdx == 'string') ? motorByName[nameOrIdx] : motors[nameOrIdx];

const sendSettings = async(nameOrIdx, settings) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf = new ArrayBuffer(1 + settingsKeys.length * 2);
  const opcodeView = new DataView(cmdBuf, 0);
  opcodeView.setUint8(0, opcode.settings);
  const wordsView = new DataView(cmdBuf, 1);
  let maxIdx = Math.max();
  settingsKeys.forEach((key, idx) => {
    if (key in settings) {
      maxIdx = Math.max(maxIdx, idx);
      const val = settings[key];
      wordsView.setUint16(idx*2, val);
      motor.settings[key] = val;
    }
  });
  if(maxIdx < 0) throw new Error('no setting specified in motor.sendSettings');
  settingsKeys.some( (key, idx) => {
    if(idx == maxIdx) return true;
    if (!(key in settings)) {
      wordsView.setUint16(idx*2, motor.settings[key]);
    };
  });
  return i2c.cmd(motor.i2cAddr, cmdBuf, 1 + (maxIdx+1)*2);
}

const sendOneByteCmd = async(nameOrIdx, cmdByte) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  return i2c.cmd(motor.i2cAddr, [cmdByte]);
};

const startHoming = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x10) };
const stop        = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x12) };
const stopThenRst = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x13) };
const reset       = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x14) };
const motorOn     = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x15) };
const fakeHome    = async (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x16) };

const setLeds = async (led1, led2, led3, led4) => {
  return sendOneByteCmd(0x1d, led1 << 6 | led2 << 4 | led3 << 2 | led4);
}

const move = async (nameOrIdx, pos, speed, accel) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf = new ArrayBuffer(5);       
  if(!speed && !accel) {              
    const opcodeView = new DataView(cmdBuf);
    opcodeView.setUint16(0, opcode.move + pos);
    return i2c.cmd(motor.i2cAddr, cmdBuf, 2);
  }
  if(!accel) { 
    const opcodeView = new Uint8Array(cmdBuf);
    opcodeView[0] = opcode.speedMove + ((speed >> 8) & 0x3f);
    const posView = new DataView(cmdBuf,1);
    posView.setUint16(1, pos);
    return i2c.cmd(motor.i2cAddr, cmdBuf, 3);
  }
  else {              
    const opcodeView = new Uint8Array(cmdBuf);
    opcodeView[0] = opcode.accelSpeedMove + accel;
    const speedPosView = new DataView(cmdBuf,1);
    speedPosView.setUint16(0, speed);
    speedPosView.setUint16(2, pos);
    return i2c.cmd(motor.i2cAddr, cmdBuf, 5);
  }
}

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

const parseStatus = (motor, buf) => {
  const stateByte = buf[0];
  let pos = ((buf[1] << 8) | buf[2]);
  if (pos > 32767) pos -= 65536;
  return {
    version:     stateByte >> 7,
    name:        motor.name,
    busy:    !!((stateByte & 0x04) >> 2),
    motorOn: !!((stateByte & 0x02) >> 1),
    homed:   !! (stateByte & 0x01),
    pos,
  };
}

// find status from motor that reported error
// also clears all errors in mcu
const findErrMotor = async (mcu) => {
  const motorsInMcu = [];
  const promiseArr = [];
  motors.forEach( (motor, idx) => {
    if(motor.mcu === mcu) {
      motorsInMcu.push(motor);
      promiseArr.push(i2c.status(motor.i2cAddr));
    }
  });
  (await Promise.all(promiseArr)).forEach( (buf, idx) => { 
    if(buf[0] & 0x70) return {buf, mot: motorsInMcu[idx]};
  });
  return {};
}

const getStatus = async (nameOrIdx) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const recvBuf = await i2c.status(motor.i2cAddr);
  if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
    throw new Error('status checksum error');
  }
  if(recvBuf[0] & 0x08) {
    // some motor had an error
    let errBuf   = recvBuf;
    let errCode  = recvBuf[0] & 0x70;
    let errMotor = motor;
    const {buf, mot} = await findErrMotor(motor.mcu);
    if(buf) {
      errBuf   = buf;
      errCode  = buf[0] & 0x70;
      errMotor = mot;
    }
    // stop all pending i2c, reset all motors in all mcus
    i2c.clrQueue();
    const promiseArr = [];
    for(let idx = 0; idx < motors.length; idx++) promiseArr.push(reset(idx));
    await Promise.all(promiseArr);
    const err = new Error();
    err.motor = errMotor;
    if(errCode) {
      err.message = 
          `Error in ${errMotor.descr} motor: ${errString((errBuf[0] & 0x70) >> 4)}`;
      err.motorStatus = parseStatus(errMotor, errBuf);
    }
    else {
      err.message = `Unknown motor error in mcu ${errMotor.mcu}.`;
      err.motorStatus  = parseStatus(motor, recvBuf);
    }
    throw err;
  }
  return parseStatus(motor, recvBuf);
}

const getTestPos  = async (nameOrIdx) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  // make sure these are adjacent in I2C queue
  // request test pos one-byte-cmd is 0x11
  const promise1 = i2c.cmd(motor.i2cAddr, Buffer.from([0x11]));
  const promise2 = i2c.status(motor.i2cAddr);
  await promise1;
  const recvBuf = await promise2;
  if(recvBuf[0] != 0x04) 
    throw new Error('invalid state byte in getTestPos: ' + util.inspect(recvBuf));
  let pos = ((recvBuf[1] << 8) | recvBuf[2]);
  if (pos > 32767) pos -= 65536;
  return pos;
}

const notBusy = async (nameOrIdxArr) => {
  if(!Array.isArray(nameOrIdxArr)) {
    nameOrIdxArr = [nameOrIdxArr];
  };
  while(true) {
    const promiseArr = [];
    nameOrIdxArr.forEach( (nameOrIdx) => {
      promiseArr.push(getStatus(nameOrIdx));
    });
    let stillBusy = false;
    (await Promise.all(promiseArr)).forEach( (status) => { 
      if(status.busy) stillBusy = true;
    });
    if(!stillBusy) return;
  }
}

// should use nameOrIdxArr only when debugging
const initAllMotors = async (nameOrIdxArr) => {
  if (!nameOrIdxArr) 
    nameOrIdxArr = motors.map(motor => motor.idx);
  if(!Array.isArray(nameOrIdxArr)) {
    nameOrIdxArr = [nameOrIdxArr];
  };
  const promiseArr = [];
  nameOrIdxArr.forEach( (nameOrIdx) => {
    const motor = motorByNameOrIdx(nameOrIdx);
    promiseArr.push(getStatus(motor.idx));
    promiseArr.push(sendSettings(motor.idx, motor.settings));
  });
  return Promise.all(promiseArr);
}

const rpc = (msgObj) => {
  const {func, args} = msgObj;
  switch (func) {
    case 'motorByNameOrIdx':  return motorByNameOrIdx(...args);
    case 'initAllMotors':     return initAllMotors(...args);
    case 'sendSettings':      return sendSettings(...args);
    case 'startHoming':       return startHoming(...args);
    case 'fakeHome':          return fakeHome(...args);
    case 'move':              return move(...args);
    case 'stop':              return stop(...args);
    case 'stopThenRst':       return stopThenRst(...args);
    case 'reset':             return reset(...args);
    case 'motorOn':           return motorOn(...args);
    case 'setLeds':           return setLeds(...args);
    case 'getStatus':         return getStatus(...args);
    case 'getTestPos':        return getTestPos(...args);
    case 'notBusy':           return notBusy(...args);
  }
}

module.exports = {
  motorByNameOrIdx, initAllMotors, sendSettings, 
  startHoming, fakeHome, move, 
  stop, stopThenRst, reset, motorOn, setLeds,
  getStatus, getTestPos, notBusy, rpc
};
