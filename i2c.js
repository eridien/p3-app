
const Bus = require('./i2c-promise-bus.js');
const Mcu = require('./i2c-promise-device.js');

exports.init = async () => {
  const bus = await new Bus();
  const mcu = await new Mcu(bus, 8);

  try {
    const buf = Buffer.from([0xa5]);
    await mcu.writeRaw(1, buf);
  } catch (e) {
    console.log('i2c error', e.message);
  }
}