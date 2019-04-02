
const util = require('util');
const i2c  = require('./i2c');

// PCA9554 i2c addr
const i2cAddr = 0x27;  

// PCA9554 registers
const inputReg  = 0;
const outputReg = 1;
const polInvReg = 2;
const trisReg   = 3;

const motMask    = 0x01;  // motor led
const wifiMask   = 0x02;  // wifi led
const lightsMask = 0x0c;  // cam lights
const buzMask    = 0x10;  // buzzer,  1:on
const swMask     = 0x80;  // switch is only input

const motOfs       = 0;   // motor led bit (d2)
const wifiOfs      = 1;   // wifi led bit  (d1)
const lightsOfs    = 2;   // right light bit (d2)
const buzOfs       = 4;   // buzzer bit (d4)

// mirror of output reg;
let curOutRegVal = 0;

let lastSwVal = curSwVal = lastCbSwVal = null;

let swCallbacks = [];
let forceCallback = true;

const get = async (reg) => {
  try {
    // make sure these are adjacent in I2C queue
    const promise1 = i2c.write(i2cAddr, reg);
    const promise2 = i2c.read(i2cAddr);
    await promise1;
    const newVal = (await promise2)[0];
    return newVal;
  }
  catch(e) {
    console.log('exp get error', reg,  e);
  }
}

const set = async (reg, data) => {
  try {
    await i2c.write(i2cAddr, [reg, data]);
    if(reg == outputReg) curOutRegVal = data;
  }
  catch(e) {
    console.log('exp set error', {reg, data}, e);
  }
}

const readSw = async () => {
  try {
    // make sure these are adjacent in I2C queue
    const promise1 = i2c.write(i2cAddr, inputReg);
    const promise2 = i2c.read(i2cAddr);
    await promise1;
    const newVal = !!((await promise2)[0] & swMask);
    console.log('readSw:', newVal);
    let newEq = (lastSwVal === newVal);
    lastSwVal = newVal;
    if(newEq) curSwVal = newVal;  // two reads must match for debounce
    return curSwVal;
  }
  catch(e) {
    console.log('exp readSw error', e.message);
    return false;
  }
}

const setLights = async (lights) =>
  set(outputReg, (curOutRegVal & ~lightsMask) | 
                   (lightsMask & (lights << lightsOfs)));

const setWifiLed = async (on) =>
  set(outputReg, (curOutRegVal & ~wifiMask) | 
                   (wifiMask & (on << wifiOfs)));
     
const setMotorLed = async (on) =>
  set(outputReg, (curOutRegVal & ~motMask) | 
                   (motMask & (on << motOfs)));

const setBuzzer = async (on, ms) => {
  await set(outputReg, (curOutRegVal & ~buzMask) | 
                   (buzMask & (on << buzOfs)));
	if(on && ms)
		setTimeout(() => setBuzzer(false), ms);
}

const swOn = () => curSwVal;

const onSwChg = (cb) => { 
  swCallbacks.push(cb);
  forceCallback = true;
}

// 2 to 4 ms per chk, 10% of values were 11 ms, max: 81 ms
const chkSw = async () => {
  await readSw();
  console.log(curSwVal);
  if(forceCallback || curSwVal !== lastCbSwVal) {
    lastCbSwVal = curSwVal;
    for(let cb of swCallbacks) {
      cb.call(null, curSwVal);
    }
  }
  forceCallback = false;
};

const init = async () => {
  try {
    await set(trisReg, swMask);
    await set(polInvReg, 0);
    const treg = await get(trisReg);
    const preg = await get(polInvReg);
    if(treg != swMask || preg != 0)
      throw new Error('exp init reg check failed');
    setInterval( chkSw, 100 );
  }
  catch(e) {
    console.log('exp init error', e);
  }
}

module.exports = {init, setLights, setWifiLed, setMotorLed, setBuzzer, swOn, onSwChg};
