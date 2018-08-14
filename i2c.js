
const pify = require('pify');

globalBus = require('i2c-bus').open(1, () => { });

i2cWriteP = pify(globalBus.i2cWrite);

exports.init = async () => {
  try {
    const buf = Buffer.from([0xa5]);
    await i2cWriteP(8, 1, buf);
    console.log('done');
  } catch (e) {
    console.log('i2c error', e.message);
  }
}
