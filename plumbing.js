
const pin_vpump  = 13;
const pin_vbleed = 22;
const pin_vs1    = 15; // not on first board
const pin_vs2    = 16;
const pin_vs3    = 18;
const pin_all_out = [pin_vpump, pin_vbleed, pin_vs1, pin_vs2, pin_vs3];

const gpio = require('rpi-gpio');
const gpiop = gpio.promise;
const sleep = require('util').promisify(setTimeout);

init = async () => {
  try {
    for (let pin of pin_all_out) {
      await gpiop.setup(pin, gpio.DIR_LOW);
    }
  }
  catch (e) {
    console.error("init error:", e.message);
  }
}

const onOff = async (idx, on) => {
  try {
    gpiop.write(pin_all_out[idx], on);
  } catch (error) {
    console.log("onOff error:", e.message);
  }
}

module.exports = {init, onOff};

