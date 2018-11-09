
const pin = {
  pump  : 13,
  bleed : 22,
  A     : 16,
  B     : 18,
}

const gpio  = require('rpi-gpio');
const gpiop = gpio.promise;

init = async () => {
  try {
    for(let name in pin)
      await gpiop.setup(pin[name], gpio.DIR_LOW);
  }
  catch (e) {
    console.error("init error:", e.message);
  }
}

const onOff = async (pinName, on) => {
  try {
    gpiop.write(pin[pinName], on);
  } catch (e) {
    console.log("onOff error:", e.message);
  }
}

module.exports = {init, onOff};
