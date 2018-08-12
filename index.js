
const pin_pwrsw = 11;
const pin_led = 7;
const pin_vs1 = 15;
const pin_vs2 = 16;
const pin_vs3 = 18;
const pin_vbleed = 22;
const pin_vpump = 13;
const pin_all_out = [pin_led, pin_vs1, pin_vs2, pin_vs3, pin_vbleed, pin_vpump];
const on = true, off = false;
const onOff = on => on ? 'on' : 'off';

const gpio = require('rpi-gpio')
const gpiop = gpio.promise;
const sleep = require('util').promisify(setTimeout);

const pumpOnOff = async on => gpiop.write(pin_vpump, on);
const ledOnOff = async on => gpiop.write(pin_led, on);

const init = async () => {
  await gpiop.setup(pin_pwrsw, gpio.DIR_IN, gpio.EDGE_BOTH);
  try {
    for (let pin of pin_all_out) {
      await gpiop.setup(pin, gpio.DIR_OUT);
      gpiop.write(pin, off);
    }
    ledOnOff(off);
    pumpOnOff(off);
  }
  catch (e) {
    console.log("init error:", e.message);
  }
}
var oldPwrSwOnOff = null;

gpio.on('change', (channel, pwrSwOnOffIn) => {
  let pwrSwOnOff = !pwrSwOnOffIn;
  if (channel != pin_pwrsw) return;
  if (pwrSwOnOff != oldPwrSwOnOff) {
    console.log('Power switch is now', onOff(pwrSwOnOff));
    oldPwrSwOnOff = pwrSwOnOff;
    pumpOnOff(pwrSwOnOff);
    ledOnOff(pwrSwOnOff);
  }
});

init();
