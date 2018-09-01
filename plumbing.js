
const pin_vs1 = 15;
const pin_vs2 = 16;
const pin_vs3 = 18;
const pin_vbleed = 22;
const pin_vpump = 13;
const pin_all_out = [pin_vs1, pin_vs2, pin_vs3, pin_vbleed, pin_vpump];
const on = true, off = false;
const onOff = on => on ? 'on' : 'off';

const gpio = require('rpi-gpio');
const gpiop = gpio.promise;
const sleep = require('util').promisify(setTimeout);

const pumpOnOff = async on => {
  try {
    gpiop.write(pin_vpump, on);
  } catch (error) {
    console.log("pumpOnOff error:", e.message);
  }
}

init = async () => {
  try {
    for (let pin of pin_all_out) {
      await gpiop.setup(pin, gpio.DIR_OFF);
    }
  }
  catch (e) {
    console.log("init error:", e.message);
  }
}

init();

