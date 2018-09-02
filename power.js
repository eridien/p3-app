
const i2c = require('./i2c');

const pin_pwrsw = 11;
const pin_led = 7;
const on = true, off = false;
const onOff = on => on ? 'on' : 'off';

const gpio = require('rpi-gpio')
const gpiop = gpio.promise;
const sleep = require('util').promisify(setTimeout);

const ledOnOff = async on => {
  try {
    gpiop.write(pin_led, on);
  } catch (error) {
    console.log("ledOnOff error:", e.message);
  }
}

var pwrSwitchIsOn = null;

init = async () => {
  try {
    await gpiop.setup(pin_pwrsw, gpio.DIR_IN, gpio.EDGE_BOTH);
    await gpiop.setup(pin_led, gpio.DIR_OFF);
    pwrSwitchIsOn = ! await gpiop.read(pin_pwrsw);
    pwrSwAction(pwrSwitchIsOn);
  }
  catch (e) {
    console.log("init error:", e.message);
  }
};

init();

const pwrSwAction = pwrSwOnOff => {
  try {
    console.log(); //'Power switch is now', onOff(pwrSwOnOff));
    ledOnOff(pwrSwOnOff);

    i2c.test(pwrSwOnOff);

  } catch (error) {
    console.log('pwrSwAction error:', error.message);
  }
}

gpio.on('change', (channel, value) => {
  try {
    if (channel != pin_pwrsw) return;
    let pwrSwOnOff = !value;
    if (pwrSwOnOff != pwrSwitchIsOn) {
      pwrSwitchIsOn = pwrSwOnOff;
      pwrSwAction(pwrSwOnOff);
    }
  } catch (error) {
    console.log('gpio.on change error:', error.message);
  }
});

