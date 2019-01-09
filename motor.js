
const util = require('util');
const i2c  = require('./i2c');

const motors = [
  // MCU A
  { name: 'X', i2cAddr: 0x04, mcu:0, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x1000, descr: 'X-Axis' },
  { name: 'Y', i2cAddr: 0x05, mcu:0, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x2000, descr: 'Y-Axis' },
  { name: 'H', i2cAddr: 0x06, mcu:0, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x3000, descr: 'Height' },
  { name: 'E', i2cAddr: 0x07, mcu:0, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x0000, descr: 'Extruder' },
  // MCU B       
  { name: 'R', i2cAddr: 0x08, mcu:1, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x0000, descr: 'Rotation' },
  { name: 'Z', i2cAddr: 0x09, mcu:1, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x3000, descr: 'Zoom' },
  { name: 'F', i2cAddr: 0x0a, mcu:1, homingDir: 1, homeSpeed: 2000, homeBkupSpeed:1200, homePosVal: 32000, limitSw: 0x1840, descr: 'Focus' },
  { name: 'P', i2cAddr: 0x0b, mcu:1, homingDir: 0, homeSpeed: 1000, homeBkupSpeed:  60, homePosVal:     0, limitSw: 0x2000, descr: 'Pincher' },
];

const mcuI2cAddr = [0x04, 0x08];

const defSettings = [
  // accel is 0..7: none, 4000, 8000, 20000, 40000, 80000, 200000, 400000 steps/sec/sec
  // for 1/40 mm steps: none, 100, 200, 500, 1000, 2000, 5000, 10000 mm/sec/sec
  ['accel',             4], // acceleration code (40000 steps/sec/sec, 1000 mm/sec/sec)
  ['speed',          2000], // default speed, 50 mm/sec
  ['jerk',           1200], // start/stop pull-in speed -- 30 mm/sec
  ['minPos',            0], // min pos
  ['maxPos',        32000], // max pos is 800 mm
  ['homingDir',         0], // homing dir, 0: normal (starts backwards)
  ['homeSpeed',      1000], // homing speed (25 mm/sec)
  ['homeBkupSpeed',    60], // homing back-up speed (1.5 mm/sec)
  ['homeOfs',          10], // home offset distance, 0.25 mm
  ['homePosVal',        0], // home pos value, set pos to this after homing
  ['limitSw',           0], // limit switch control (set from motor table)
  ['backlashWid',       0], // width of backslash dead interval
  ['clkPeriod',        30], // period of clock in usecs (applies to all motors in mcu)
                            // lower value reduces stepping jitter, but may cause errors
];

const settingsKeys = [];
defSettings.forEach( (keyVal) => {
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
  defSettings.forEach( (keyVal) => {
    motor.settings[keyVal[0]] = keyVal[1];
  });
  motor.settings.homingDir     = motor.homingDir;
  motor.settings.homeSpeed     = motor.homeSpeed;
  motor.settings.homeBkupSpeed = motor.homeBkupSpeed;
  motor.settings.homePosVal    = motor.homePosVal;
  motor.settings.limitSw       = motor.limitSw;

  motorByName[motor.name]   = motor;
});

// console.log(motors[6]);

const opcode = {
  move:         0x8000,
  jog:          0x2000,
  setPos:         0x01,
  speedMove:      0x40,
  accelSpeedMove: 0x08,
  getTestPos:     0x04,
  home:           0x10,
  softStop:       0x12,
  softStopRst:    0x13,
  reset:          0x14,
  motorOn:        0x15,
  fakeHome:       0x16,
  reboot:         0x17,
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
      if(val === null)
        throw new Error('invalid setting in motor.sendSettings: ' +
                        util.inspect(settings)); 
      if(val < 0) wordsView.setInt16( idx*2, val);
      else        wordsView.setUint16(idx*2, val);
      if(key == '') console.log(wordsView);
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
  return i2c.write(motor.i2cAddr, cmdBuf, 1 + (maxIdx+1)*2);
}

const sendOneByteCmd = (nameOrIdx, cmdByte) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  return i2c.write(motor.i2cAddr, [cmdByte]);
};

const home        = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.home) };
const stop        = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.softStop) };
const stopRst     = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.softStopRst) };
const reset       = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.reset) };
const motorOn     = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.motorOn) };
const fakeHome    = (nameOrIdx) => { return sendOneByteCmd(nameOrIdx, opcode.fakeHome) };

const reboot = async () => { 
  await i2c.write(mcuI2cAddr[0], opcode.reboot);
  await i2c.write(mcuI2cAddr[1], opcode.reboot);
}

const move = (nameOrIdx, pos, speed, accel) => {
  if(accel === '') accel = 0;
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf = new ArrayBuffer(5);       
  if(speed === undefined && accel === undefined) {              
    const opcodeView = new DataView(cmdBuf);
    opcodeView.setUint16(0, opcode.move + pos);
    return i2c.write(motor.i2cAddr, cmdBuf, 2);
  }
  if(accel === undefined) { 
    const opcodeView = new Uint8Array(cmdBuf);
    opcodeView[0] = opcode.speedMove + ((speed >> 8) & 0x3f);
    const posView = new DataView(cmdBuf,1);
    posView.setInt16(0, pos);
    return i2c.write(motor.i2cAddr, cmdBuf, 3);
  }
  else {              
    const opcodeView = new Uint8Array(cmdBuf);
    opcodeView[0] = opcode.accelSpeedMove + accel;
    const speedPosView = new DataView(cmdBuf,1);
    speedPosView.setUint16(0, speed);
    speedPosView.setInt16(2, pos);
    return i2c.write(motor.i2cAddr, cmdBuf, 5);
  }
}

const jog = (nameOrIdx, dir, dist) => {
  dist = Math.min(4095, Math.max(1, dist));
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf  = new ArrayBuffer(5);       
  const cmdView = new DataView(cmdBuf);
  cmdView.setUint16(0, opcode.jog + (dir << 12) + dist);
  return i2c.write(motor.i2cAddr, cmdBuf, 2);
}

const setPos = (nameOrIdx, pos) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const cmdBuf  = new ArrayBuffer(3);       
  const cmdView = new DataView(cmdBuf);
  cmdView.setUint8(0, opcode.setPos);
  cmdView.setInt16(1, pos);
  return i2c.write(motor.i2cAddr, cmdBuf, 3);
}

const errString = (code) => {
  switch (code) {
    case 0: return "";
    case 1: return "motor fault";
    case 2: return "receive overflow";
    case 3: return "bad command data";
    case 4: return "speed too fast for MCU";
    case 5: return "move out-of-bounds";
    case 6: return "no settings";
    case 7: return "not homed";
  }
}

const parseStatus = (motor, buf) => {
  const stateByte = buf[0];
  let pos = ((buf[1] << 8) | buf[2]);
  if (pos > 32767) pos -= 65536;
  return {
    version:     stateByte >> 7,
    name:        motor.name, 
    testVal: !!((stateByte & 0x08) >> 3),
    busy:    !!((stateByte & 0x04) >> 2),
    motorOn: !!((stateByte & 0x02) >> 1),
    homed:   !! (stateByte & 0x01),
    pos,
  };
}

const getStatus = async (nameOrIdx) => {
  const motor = motorByNameOrIdx(nameOrIdx);
  const recvBuf = await i2c.read(motor.i2cAddr);
  if(recvBuf[0] & 0x70) {
    // error
    let errBuf   = recvBuf;
    let errCode  = recvBuf[0] & 0x70;
    let errMotor = motor;
    // // stop all pending i2c, reset all motors in all mcus
    i2c.clrQueue();
    const promiseArr = [];
    for(let idx = 0; idx < motors.length; idx++) promiseArr.push(reset(idx));
    await Promise.all(promiseArr);
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
  const promise1 = i2c.write(motor.i2cAddr, opcode.getTestPos);
  const promise2 = i2c.read(motor.i2cAddr);
  await promise1;
  const recvBuf = await promise2;
  if(!(recvBuf[0] & 0x08)) 
    throw new Error('invalid state byte in getTestPos: ' + util.inspect(recvBuf));
  let pos = ((recvBuf[1] << 8) | recvBuf[2]);
  if (pos > 32767) pos -= 65536;
  return pos;
}

const fanOnOff    = (on) => i2c.write(mcuI2cAddr[0], opcode.auxOnOff + (on ? 1 : 0));
const buzzerOnOff = (on) => i2c.write(mcuI2cAddr[1], opcode.auxOnOff + (on ? 1 : 0));

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

const init = async () => {
  const promiseArr = [];
  motors.forEach( (motor) => {
    promiseArr.push(getStatus(motor.idx)); // clear any error
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
      case 'init':              return init(...args);
      case 'sendSettings':      return sendSettings(...args);
      case 'home':              return home(...args);
      case 'fakeHome':          return fakeHome(...args);
      case 'setPos':            return setPos(...args);
      case 'move':              return move(...args);
      case 'jog':               return jog(...args);
      case 'stop':              return stop(...args);
      case 'stopRst':           return stopRst(...args);
      case 'reset':             return reset(...args);
      case 'motorOn':           return motorOn(...args);
      case 'fanOnOff':          return fanOnOff(...args);
      case 'buzzerOnOff':       return buzzerOnOff(...args);
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
motors, motorByNameOrIdx, init, sendSettings,
  home, jog, setPos, fakeHome, move, 
  stop, stopRst, reset, motorOn, fanOnOff, buzzerOnOff, reboot,
  getStatus, getTestPos, notBusy, rpc
};
 