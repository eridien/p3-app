

const util = require('util');
const i2c  = require('./i2c');

const motors = [
  // B1
  { name: 'Y', i2cAddr: 0x08, mcu:1, hasLimit: true, descr: 'Y-Axis' },
  // B5
  { name: 'R', i2cAddr: 0x10, mcu:2, hasLimit: true,  descr: 'Rotation' },
  { name: 'E', i2cAddr: 0x11, mcu:2, hasLimit: false, descr: 'Extruder' }, // s.b. E, temp until new board
  { name: 'X', i2cAddr: 0x12, mcu:2, hasLimit: true,  descr: 'X-Axis' },
  { name: 'F', i2cAddr: 0x13, mcu:2, hasLimit: false, descr: 'Focus' },
  { name: 'Z', i2cAddr: 0x14, mcu:2, hasLimit: true,  descr: 'Zoom' },
  // U3
  { name: 'A', i2cAddr: 0x18, mcu:3, hasLimit: true,  descr: 'Tool-A' },
  { name: 'B', i2cAddr: 0x19, mcu:3, hasLimit: true,  descr: 'Tool-B' },
  { name: 'P', i2cAddr: 0x1a, mcu:3, hasLimit: false, descr: 'Paste' },
];

const UMCU = 3;
const LED_ADDR = 0x1b; // one greater than max addr in U3

// settings order must match mcu
const defBipolarSettings = [
  // accel is 0..7: none, 4000, 8000, 20000, 40000, 80000, 200000, 400000 steps/sec/sec
  // for 1/40 mm steps: none, 100, 200, 500, 1000, 2000, 5000, 10000 mm/sec/sec
  ['accel',             4], // acceleration code (40000 steps/sec/sec, 1000 mm/sec/sec)
  ['speed',          2000], // default speed, 50 mm/sec
  ['jerk',           1200], // start/stop pull-in speed -- 30 mm/sec
  ['maxPos',        32000], // max pos is 800 mm
  ['homeSpeed',      1000], // homing speed (25 mm/sec)
  ['homeBkupSpeed',    60], // homing back-up speed (1.5 mm/sec)
  ['homeOfs',          40], // home offset distance, 1 mm
  ['homePosVal',        0], // home pos value, set pos to this after homing
  ['limitSw',           0], // limit switch control
  ['clkPeriod',        30], // period of clock in usecs (applies to all motors in mcu)
                          // lower value reduces stepping jitter, but may cause errors
];

// setting names must match
const defUnipolarSettings = [
  // accel is 0..7: none, 4000, 8000, 20000, 40000, 80000, 200000, 400000 steps/sec/sec
  // for 1/40 mm steps: none, 100, 200, 500, 1000, 2000, 5000, 10000 mm/sec/sec
  ['accel',             4], // acceleration code (40000 steps/sec/sec, 1000 mm/sec/sec)
  ['speed',           400], // default speed, 50 mm/sec
  ['jerk',            100], // start/stop pull-in speed -- 30 mm/sec
  ['maxPos',        32000], // max pos is 800 mm
  ['homeSpeed',       200], // homing speed (25 mm/sec)
  ['homeBkupSpeed',    60], // homing back-up speed (1.5 mm/sec)
  ['homeOfs',          25], // home offset distance, 0.5 mm
  ['homePosVal',        0], // home pos value, set pos to this after homing
  ['limitSw',           0], // limit switch control
  ['clkPeriod',        30], // period of clock in usecs (applies to all motors in mcu)
                          // lower value reduces stepping jitter, but may cause errors
];

const settingsKeys = [];
defBipolarSettings.forEach( (keyVal) => {
  settingsKeys.push(keyVal[0]);
});

const rejPromise = (msg) => {
  return new Promise( (res, rej) => {
    console.error('rejPromise', msg);
    rej(msg);
  });
};

const motorByName = {};
motors.forEach( (motor, idx) => {
  motor.idx       = idx;
  motor.settings  = {};
  if(motor.mcu < UMCU) {
    defBipolarSettings.forEach( (keyVal) => {
      motor.settings[keyVal[0]] = keyVal[1];
    });
  }
  else {  
    defUnipolarSettings.forEach( (keyVal) => {
      motor.settings[keyVal[0]] = keyVal[1];
    });
  };
  motorByName[motor.name] = motor;
});

const opcode = {
  move:         0x8000,
  jog:          0x2000,
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

const sendSettings = (nameOrIdx, settings) => {
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

const sendOneByteCmd = (nameOrIdx, cmdByte) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  return i2c.cmd(motor.i2cAddr, [cmdByte]);
};

const home        = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x10) };
const stop        = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x12) };
const stopRst     = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x13) };
const reset       = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x14) };
const motorOn     = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x15) };
const fakeHome    = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, 0x16) };

const setLeds = (led1, led2, led3, led4) => {
  return sendOneByteCmd(LED_ADDR, led1 << 6 | led2 << 4 | led3 << 2 | led4);
}

const move = (nameOrIdx, pos, speed, accel) => {
  if(accel === '') accel = 0;
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf = new ArrayBuffer(5);       
  if(!speed && accel === null) {              
    const opcodeView = new DataView(cmdBuf);
    opcodeView.setUint16(0, opcode.move + pos);
    return i2c.cmd(motor.i2cAddr, cmdBuf, 2);
  }
  if(accel === null) { 
    const opcodeView = new Uint8Array(cmdBuf);
    opcodeView[0] = opcode.speedMove + ((speed >> 8) & 0x3f);
    const posView = new DataView(cmdBuf,1);
    posView.setUint16(0, pos);
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

const jog = (nameOrIdx, dir, dist) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf  = new ArrayBuffer(5);       
  const cmdView = new DataView(cmdBuf);
  cmdView.setUint16(0, opcode.jog + (dir << 12) + dist);
  return i2c.cmd(motor.i2cAddr, cmdBuf, 2);
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
  const resArr = await Promise.all(promiseArr);
  resArr.forEach( (buf, idx) => { 
    console.debug('resArr', resArr);
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
    console.debug(buf);
    // // stop all pending i2c, reset all motors in all mcus
    // i2c.clrQueue();
    // const promiseArr = [];
    // for(let idx = 0; idx < motors.length; idx++) promiseArr.push(reset(idx));
    // await Promise.all(promiseArr);
    const err = new Error();
    err.motor = errMotor;
    if(errCode) {
      err.message = `Motor ${errMotor.name}: ${errString((errBuf[0] & 0x70) >> 4)}`;
      err.motorStatus = parseStatus(errMotor, errBuf);
    }
    else {
      // debugger;
      err.message = `Unknown motor error in mcu ${errMotor.mcu}, motor ${errMotor.name}.`;
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
      if(status.busy) stillBusy = true;!u
    });
    if(!stillBusy) return;
  }
}

const initAllMotors = async () => {
  const promiseArr = [];
  motors.forEach( (motor) => {
    promiseArr.push(getStatus(motor.idx));
    promiseArr.push(sendSettings(motor.idx, motor.settings));
  });
  return Promise.all(promiseArr);
}

const rpc = async (msgObj) => {
  const {func, args} = msgObj;
  try{
    switch (func) {
      case 'motors':            return new Promise((res) => res(motors));
      case 'motorByNameOrIdx':  return motorByNameOrIdx(...args);
      case 'initAllMotors':     return initAllMotors(...args);
      case 'sendSettings':      return sendSettings(...args);
      case 'home':              return home(...args);
      case 'fakeHome':          return fakeHome(...args);
      case 'move':              return move(...args);
      case 'jog':               return jog(...args);
      case 'stop':              return stop(...args);
      case 'stopRst':           return stopRst(...args);
      case 'reset':             return reset(...args);
      case 'motorOn':           return motorOn(...args);
      case 'setLeds':           return setLeds(...args);
      case 'getStatus':         return getStatus(...args);
      case 'getTestPos':        return getTestPos(...args);
      case 'notBusy':           return notBusy(...args);
      default: throw new Error('invalid motor function name: ' + func);
    } 
  }
  catch(err) {
    throw new Error(`motor command exception, ${err.message}: ${util.inspect(msgObj)}`);
  };
}

module.exports = {
  motors, motorByNameOrIdx, initAllMotors, sendSettings, 
  home, jog, fakeHome, move, 
  stop, stopRst, reset, motorOn, setLeds,
  getStatus, getTestPos, notBusy, rpc
};
 