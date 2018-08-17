

// i2c protocol for MCUs
//
// move/home commands start immediately even when moving
// all position and distance is in 1/80 mm units
// all speed is in mm/sec (except speed/move cmd)
// all accelleration is in mm/sec/sec
// homing on unit with no limit switch just sets current position to 150 mm

// writes ...
//   0aaa aaaa  goto command, top    7 bits of goto addr
//      aaaa aaaa followed by bottom 8 bits
//   1000 ssss   (speed/move cmd) set max speed = s*10 mm/sec, move to addr a
//     saaa aaaa top    7 bits of signed move addr
//     aaaa aaaa bottom 8 bits
//   1001 0000  start homing even if moving
//   1010 0000  soft stop, deccelerates
//   1011 0000  soft stop, deccelerates first, then reset
//   1100 0000  hard stop (immediate reset)
//   1101 0000  motor on (reset off)
//   1111 0000  set regs, 16-bit values, set only when idle
//      max speed
//      no-accelleration speed limit (and start speed)
//      accelleration rate
//      homing speed
//      homing back-up speed
//      home offset distance
//
// Error codes 
//      1: fault
//      2: i2c buffer overflow
//      3: i2c cksum error
//      4: command not finished
//      5: unexpected limit error
//
// Busy Codes
//      1: moving, 2: homing, 3: stopping soft
//
// read, status byte and optional current position ...
//   veee bboz  status byte
//      v: version (1-bit)
//      e: error code (see above)
//      bb: busy code
//      o: motor on (not in reset)
//      z: at home (current position is zero)
//   saaa aaaa  current position, top 8 bits of signed 16-bit word
//   aaaa aaaa     followed by bottom 8 bits

const pify = require('pify');

globalBus = require('i2c-bus').open(1, () => { });

i2cReadP = pify(globalBus.i2cRead);
i2cWriteP = pify(globalBus.i2cWrite);

exports.init = async () => {
  try {
    console.log('time before:', Date.now());
    let buf = Buffer(3);
    await i2cWriteP(8, 10, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    await i2cReadP(8, buf.length, buf);
    console.log('time after :', Date.now());
  } catch (e) {
    console.log('i2c error', e.message);
  }
}
