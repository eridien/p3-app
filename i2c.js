

// i2c protocol for MCUs
//
// goto addr command immediately starts moving even if in middle of move
// all position and distance is in 1/80 mm units
// all speed is in 1/80 mm/sec
// all accelleration is in 1/80 mm/sec/sec
// no real cmd word, bytes read or written until stop bit
// set current position (signed 16-bit) may follow homing or stop commands
// homing with no limit switch just sets current position

// writes ...
//   0aaa aaaa  goto command, top 7 bits of goto addr
//      aaaa aaaa followed by bottom 8 bits of goto addr
//   1000 00pp  set max speed reg
//      pp is index into max speed table, goto command (addr) may follow
//   1001 0000  start homing even if moving
//   1010 0000  soft stop, deccelerates
//   1011 0000  soft stop, deccelerates first, then reset
//   1100 0000  hard stop (immediate reset)
//   1111 0000  set regs, optional number of 16-bit values, set only when idle
//      max speed table[0]
//      max speed table[1]
//      max speed table[2]
//      max speed table[3]
//      no-accelleration speed limit (and start speed)
//      accelleration rate
//      homing speed
//      homing back-up speed
//      home offset distance
//
// read, status byte and optional current position ...
//   ftwm hoz0  status byte
//      f: fault               (common to all motors) (cleared on read) 
//      t: i2c timing error    (common to all motors) (cleared on read) 
//      w: i2c buffer overflow (common to all motors) (cleared on read) 
//      m: busy moving
//      h: busy homing
//      o: motor on (not in reset)
//      z: at home (current position is zero)
//   saaa aaaa  current position, top 8 bits of signed 16-bit word
//   aaaa aaaa  followed by bottom 8 bits of signed 16-bit word

const pify = require('pify');

globalBus = require('i2c-bus').open(1, () => { });

i2cReadP = pify(globalBus.i2cRead);
i2cWriteP = pify(globalBus.i2cWrite);

exports.init = async () => {
  try {
    console.log('time before write:', Date.now());
    await i2cWriteP(8, 10, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    console.log('time after  write:', Date.now());
  } catch (e) {
    console.log('i2c error', e.message);
  }
}
