
const util = require('util');
const i2c  = require('./i2c');

// PCA9554 i2c addr
const i2cAddr = 0x27;  

// PCA9554 registers
const inputReg  = 0;
const outputReg = 1;
const polInvReg = 2;
const trisReg   = 3;

const swMask     = 0x80;  // sw is only input
const motMask    = 0xc0;  // red/green motor led
const wifiMask   = 0x10   // green wifi led
const lightsMask = 0x0f;  // cam lights leds (nesw)

const lightsOfs  = 0;     // rightmost light bit (d0)
const wifiOfs    = 4;     // rightmost wifi bit  (d4)
const motOfs     = 5;     // rightmost motor bit (d5)

// mirror of output reg;
let curOutReg = 0;

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
    // console.log('get reg:', reg, 'val:', newVal);
    return newVal;
  }
  catch(e) {
    console.log('exp get error', reg,  e);
  }
}

const set = async (reg, data) => {
  try {
    await i2c.write(i2cAddr, [reg, data]);
    if(reg == outputReg) curOutReg = data;
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
    const newVal = ((await promise2)[0] & swMask);
    // console.log('readSw:', newVal);
    let newEq = (lastSwVal === newVal);
    lastSwVal = newVal;
    if(newEq) curSwVal = newVal;
    return curSwVal;
  }
  catch(e) {
    console.log('exp readSw error', e);
  }
}

const setLights = async (lights) => {
  set(outputReg,
    (curOutReg & ~lightsMask) | (lightsMask & (~lights << lightsOfs)));
}

const setWifiLed = async (on) => {
  set(outputReg,
    (curOutReg & ~wifiMask) | (wifiMask & (~on << wifiOfs)));
}

const setMotorLed = async (on, grnNotRed) => {
  set(outputReg,
    (curOutReg & ~motMask) | (on ? ((grnNotRed ? 1 : 2) << motOfs) : 0) );
}

const swOn = () => curSwVal;

const onSwChg = (cb) => { 
  swCallbacks.push(cb);
  forceCallback = true;
}

const chkForCallback = async () => {
  await readSw();
  if(forceCallback || curSwVal !== lastCbSwVal) {
    lastCbSwVal = curSwVal;
    for(let cb of swCallbacks) {
      cb.call(null, curSwVal);
    }
  }
  forceCallback = false;
};
chkForCallback();

setInterval( chkForCallback, 100 );

module.exports = {init, setLights, setWifiLed, setMotorLed, swOn, onSwChg};
