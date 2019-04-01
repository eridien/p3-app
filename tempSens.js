
// temp units are degrees C.  Range is 0 .. 127

const util = require('util');
const i2c  = require('./i2c');

// AT30TS74 i2c addr
const i2cAddr    = 0x48;

const tempAddr   = 0;
const confAddr   = 1;
const tLowAddr   = 2;
const tHighAddr  = 3;

// OS:0, R:0 (9 bits), FT:2 (4 faults), POL:1 (actv hi), CMP:0 (compare mode), SD:0 (on)  
// 0001 0100
const configVal  = 0x14; 
try {
	// make sure these are adjacent in I2C queue
	await i2c.write(i2cAddr, [confAddr, configVal]);
  await i2c.write(i2cAddr, tempAddr); // leave in temp read mode
}
catch(e) {
	console.log('tempsens config write error',  e);
}

const setHysterisis = (lo, hi) => {
  try {
    // make sure these are adjacent in I2C queue
    await i2c.write(i2cAddr, [tLowAddr,  lo, 0]);
    await i2c.write(i2cAddr, [tHighAddr, hi, 0]);
    await i2c.write(i2cAddr, tempAddr); // leave in temp read mode
  }
  catch(e) {
    console.log('tempsens setHysterisis error', lo, hi,  e);
  }
}

const readTemp = (lo, hi) => {
  try {
    return (await i2c.read(i2cAddr))[0];
  }
  catch(e) {
    console.log('tempsens readTemp error', reg,  e);
  }
}

// S.B set from app settings  TODO
const tLowVal  = 35; // degs C,  95 F 
const tHighVal = 45; // degs C, 113 F
setHysterisis(tLowVal, tHighVal);

module.exports = {setHysterisis, readTemp};
