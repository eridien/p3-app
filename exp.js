
const util = require('util');
const i2c  = require('./i2c');

// PCA9554 i2c addr
const i2cAddr = 0x27;  

// PCA9554 registers
const inputReg  = 0;
const outputReg = 1;
const polInvReg = 2;
const trisReg   = 3;
const trisVal = 0x01;  // sw is only input

const cmd = async (reg, data) =>
  await i2c.write(i2cAddr, [reg, data]);

const init = async () => {
  try {
    await cmd(trisReg, trisVal);
    await cmd(polInvReg, 0);
  }
  catch(e) {
    console.log('exp init error', e);
  }
}

const set = async (data) => {
  try {
    await cmd(outputReg, data);
  }
  catch(e) {
    console.log('exp set error', e);
  }
}

const swOn = async () => {
  try {
    // make sure these are adjacent in I2C queue
    const promise1 = i2c.write(i2cAddr, inputReg);
    const promise2 = i2c.read(i2cAddr);
    await promise1;
    return !!((await promise2) & trisVal);
  }
  catch(e) {
    console.log('exp get error', e);
  }
}

module.exports = {init, swOn, set};
