
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

const pumpOnOff = async on => {
  try {
    gpiop.write(pin_vpump, on);
  } catch (error) {
    console.log("pumpOnOff error:", e.message);
  }
}
const ledOnOff = async on => {
  try {
    gpiop.write(pin_led, on);
  } catch (error) {
    console.log("pumpOnOff error:", e.message);
  }
}

var lastPwrSwOnOff = null;

const init = async () => {
  await gpiop.setup(pin_pwrsw, gpio.DIR_IN, gpio.EDGE_BOTH);
  try {
    for (let pin of pin_all_out) {
      await gpiop.setup(pin, gpio.DIR_OFF);
    }
    lastPwrSwOnOff = ! await gpiop.read(pin_pwrsw);
    pwrSwAction(lastPwrSwOnOff);
  }
  catch (e) {
    console.log("init error:", e.message);
  }
}

const pwrSwAction = pwrSwOnOff => {
  try {
    console.log('Power switch is now', onOff(pwrSwOnOff));
    pumpOnOff(pwrSwOnOff);
    ledOnOff(pwrSwOnOff);
  } catch (error) {
    console.log('pwrSwAction error:', error.message);
  }
}

gpio.on('change', (channel, value) => {
  try {
    if (channel != pin_pwrsw) return;
    let pwrSwOnOff = !value;
    if (pwrSwOnOff != lastPwrSwOnOff) {
      lastPwrSwOnOff = pwrSwOnOff;
      pwrSwAction(pwrSwOnOff);
    }
  } catch (error) {
    console.log('gpio.on change error:', error.message);
  }
});

init();
