
const util = require('util');
const i2c  = require('./i2c');

// PCA9554 i2c addr
const i2cAddr = 0x27;  

// PCA9554 registers
const inputReg  = 0;
const outputReg = 1;
const polInvReg = 2;
const trisReg   = 3;

const swMask     = 0x80;  // switch is only input
const motMask    = 0xc0;  // red/green motor led
const wifiMask   = 0x10   // green wifi led
const lightsMask = 0x0f;  // cam lights leds (nesw)

const lightsOfs  = 0;     // rightmost light bit (d0)
const wifiOfs    = 4;     // rightmost wifi bit  (d4)
const motOfs     = 5;     // rightmost motor bit (d5)

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

const init = async () => {
  try {
    await set(trisReg, swMask);
    await set(polInvReg, 0);
    const treg = await get(trisReg);
    const preg = await get(polInvReg);
    if(treg != swMask || preg != 0)
      throw new Error('exp init reg check failed:', {swMask, treg, preg});
  }
  catch(e) {
    console.log('exp init error', e);
  }
}

const readSw = async () => {
  try {
    // make sure these are adjacent in I2C queue
    const promise1 = i2c.write(i2cAddr, inputReg);
    const promise2 = i2c.read(i2cAddr);
    await promise1;
    const newVal = !!((await promise2)[0] & swMask);
    // console.log('readSw:', newVal);
    let newEq = (lastSwVal === newVal);
    lastSwVal = newVal;
    if(newEq) curSwVal = newVal;
    return curSwVal;
  }
  catch(e) {
    console.log('exp readSw error', e.message);
    return 0;
  }
}

const setLights = async (lights) =>
  set(outputReg, (curOutRegVal & ~lightsMask) | 
       (lightsMask & (~lights << lightsOfs)));

const setWifiLed = async (on) =>
  set(outputReg, (curOutRegVal & ~wifiMask) | 
        (wifiMask & (~on << wifiOfs)));

const setMotorLed = async (on, grnNotRed) => 
  set(outputReg, (curOutRegVal & ~motMask) | 
        (on ? (grnNotRed ? (2 << motOfs) : (1 << motOfs)) : 0) );

const swOn = () => curSwVal;

const onSwChg = (cb) => { 
  swCallbacks.push(cb);
  forceCallback = true;
}

// 2 to 4 ms per chk, 10% of values were 11, max: 81
const chkSw = async () => {
  await readSw();
  if(forceCallback || curSwVal !== lastCbSwVal) {
    lastCbSwVal = curSwVal;
    for(let cb of swCallbacks) {
      cb.call(null, curSwVal);
    }
  }
  forceCallback = false;
};
chkSw();

setInterval( chkSw, 100 );

module.exports = {init, setLights, setWifiLed, setMotorLed, swOn, onSwChg};
