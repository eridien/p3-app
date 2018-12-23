
const util = require('util');
const i2c  = require('./i2c');

// PCA9554 i2c addr
const i2cAddr = 0x27;  

// PCA9554 registers
const inputReg  = 0;
const outputReg = 1;
const polInvReg = 2;
const trisReg   = 3;

const trisVal    = 0x01;  // sw is only input
const lightsMask = 0xf0;  // cam lights leds (nesw)
const wifiMask   = 0x08   // green wifi led
const motMask    = 0x06;  // red/green motor led

const lightsOfs  = 4;     // rightmost light bit (d4)
const wifiOfs    = 3;     // rightmost wifi bit (d3)
const motOfs     = 1;     // rightmost light bit (d1)

// mirror of output reg;
let curOutReg = 0;

let swCallbacks = [];
let curSwVal = null;
let debounceHistory = [];

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
    await cmd(outputReg, data);;
    curOutReg = data;
  }
  catch(e) {
    console.log('exp set error', e);
  }
}

const readSw = async () => {
  try {
    // make sure these are adjacent in I2C queue
    const promise1 = i2c.write(i2cAddr, inputReg);
    const promise2 = i2c.read(i2cAddr);
    await promise1;
    const valRead = !!((await promise2) & trisVal);
    let allEqNew = true;
    for(let v of debounceHistory) {
      if(v !== valRead) {
        allEqNew = false;
        break;
      }
    }
    debounceHistory.push(valRead);
    if (debounceHistory.length > 3) debounceHistory.shift();
    if(allEqNew) curSwVal = valRead;
    return curSwVal;
  }
  catch(e) {
    console.log('exp readSw error', e);
  }
}

const setLights = async (lights) => {
  set((curval & ~lightsMask) | (lights << lightsOfs));
}

const setWifiLed = async (on) => {
  set((curval & ~wifiMask) | (on << wifiOfs));
}

const setMotLed = async (on, grnNotRed) => {
  set( (curval & ~motMask) | (on ? ((grnNotRed ? 2 : 1) << motOfs) : 0));
}

const swOn = () => curSwVal;

const onSwchg = async (cb) => { 
  swCallbacks.push(cb);
}

(async () => {
  curSwVal = await readSw();
  setInterval( async () => {
    newVal = await readSw();
    if(newVal !== curSwVal) {
      curSwVal = newVal;
      for(let cb of swCallbacks) {
        cb.call(null, curSwVal);
      }
    }
  }, 200);
})();

module.exports = {init, swOn, onSwchg, setLights, setWifiLed, setMotLed};
