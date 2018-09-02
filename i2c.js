

const pify = require('pify');
const sleep = require('util').promisify(setTimeout);

globalBus = require('i2c-bus').open(1, () => { });

i2cReadP = pify(globalBus.i2cRead);
i2cWriteP = pify(globalBus.i2cWrite);

// // settings command
// const STEPS_PER_MM = 40;
// const opcode = 0x1f;
// const cmdData = [
//   100 * STEPS_PER_MM, //  max speed   (and simple move cmd speed) 
//   300 * STEPS_PER_MM, //  max pos     (min pos is always zero))
//   20 * STEPS_PER_MM, //  no-acceleration speed limit (and start speed when stopped)
//   1000 * STEPS_PER_MM, //  acceleration rate (steps/sec/sec)
//   20 * STEPS_PER_MM, //  homing speed
//   5 * STEPS_PER_MM, //  homing back-up speed
//   2 * STEPS_PER_MM, //  home offset distance
//   0, //  home pos value (set cur pos to this value after homing, usually 0)
//   0, //  use limit sw for home direction
// ];

// home command
const opcode = 0x10;
const cmdData = [];

let cmdBuf = new ArrayBuffer(1 + cmdData.length*2);
let opcodeView = new DataView(cmdBuf, 0, 1);
(() => {
  opcodeView.setUint8(0, opcode);
  let wordsView = new DataView(cmdBuf, 1, cmdData.length*2);
  for (const [ofs, word] of cmdData.entries()) {
    wordsView.setUint16(ofs*2, word);
  } 
})();

let chkState = async (motIdx) => {
  let parseState = (motIdx, buf) => {
    let state = buf[0];
    let pos = ((buf[1] << 8) | buf[2]);
    return {
      // motIdx,
      // vers: (state >> 7),
      err: errString((state & 0x70) >> 4),
      errBit: (state & 0x08) >> 3,
      busy: (state & 0x04) >> 2,
      motOn: (state & 0x02) >> 1,
      homed: state & 1,
      pos,
    };
  }
  try {
    let recvBuf = Buffer(4);
    await i2cReadP(8 + motIdx, recvBuf.length, recvBuf);
    if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
      console.log('status read cksum error:', recvBuf);
      throw (new Error('cksum error'));
    }
    console.log(parseState(motIdx, recvBuf));
  } catch (e) {
    console.log('i2c read error', e.message);
  }
}

exports.test = async (pwrSwOnOff) => {
  let motIdx = 0;
  try {
    if (!pwrSwOnOff) {
      await chkState(motIdx);
    }
    opcodeView.setUint8(0, pwrSwOnOff ? opcode : 0x14);  // opcode or stop
    await i2cWriteP(8 + motIdx, cmdBuf.byteLength, Buffer.from(cmdBuf));
    console.log('cmd sent:', '0x'+opcodeView.getUint8(0).toString(16));
    sleep(1000);
    await chkState(motIdx);
  } catch (e) {
    console.log('i2c write error', e.message);
  }
}

errString = (code) => {
  switch (code) {
    case 0: return "";
    case 1: return "motor fault";
    case 2: return "i2c overflow";
    case 3: return "bad command data (first byte invalid or length wrong)";
    case 4: return "command processing took too long";
    case 5: return "stepping took too long (too fast)";
    case 6: return "move out-of-bounds";
    case 7: return "move cmd when not homed";
  }
}

// steps are in 1/8 step (bipolar) or one phase (unipolar)
//    for bipolar:
//       steps/rev:        1600
//       dist/rev:           40 mm
//       max distance:      800 mm
//       max step count: 32,000
//
//    for unipolar:
//       steps/rev:        2048
//       dist/rev:           40 mm
//       max distance:      625 mm
//       max step count: 32,000

// move/home commands start immediately even when already busy
// all position and distance is in steps (bi: 1/8 ustep, uni: phase)
// all speed is in steps/sec (except speed-move cmd)
// homing with no limit switch just sets current position to settings value

// steps are in 1/8 ustep (bipolar) or one phase (unipolar)
//    for bipolar:
//       steps/rev:        1600
//       dist/rev:           40 mm
//       max distance:      800 mm
//       max step count: 32,000
//
//    for unipolar:
//       steps/rev:        2048
//       dist/rev:           40 mm
//       max distance:      625 mm
//       max step count: 32,000
//
// writes ...
//   (first word of recv buffer is buf len)
//
//   -- move ommands --
//   1aaa aaaa  goto command, top 7 bits of goto addr
//      aaaa aaaa followed by bottom 8 bits
//   01ss ssss (speed-move cmd) set max speed = s*256 steps/sec and move to addr
//     0aaa aaaa top 7 bits of move addr
//     aaaa aaaa bottom 8 bits
//
//   -- one-byte commands --
//   0001 0000  start homing
//   0001 0001  next read position is end position of homing (test pos)
//   0001 0010  soft stop, deccelerates, no reset
//   0001 0011  soft stop, deccelerates first, then reset
//   0001 0100  hard stop (immediate reset)
//   0001 0101  motor on (hold place, reset off)
//   0001 0110  set curpos to home pos value setting (fake homing)
//
//   -- 17 byte settings command --
//   0001 1111  load settings, 16-bit values
//      max speed   (and simple move cmd speed) 
//      max pos     (min pos is always zero))
//      no-acceleration speed limit (and start speed when stopped)
//      acceleration rate (steps/sec/sec)
//      homing speed
//      homing back-up speed
//      home offset distance
//      home pos value (set cur pos to this value after homing, usually 0)
//
// -- 4-byte state response --
// error code and bit cleared on status read, only on motor being read
// Error codes 
//   MOTOR_FAULT_ERROR   1
//   I2C_OVERFLOW_ERROR  2
//   CMD_DATA_ERROR      3
//   CMD_NOT_DONE_ERROR  4
//   STEP_NOT_DONE_ERROR 5
//   MOTOR_LIMIT_ERROR   6
//   NOT_HOMED_ERROR     7
//
// state response bytes
//   1) vccc eboz  state byte
//      v: version (1-bit)
//    ccc: error code (see above) (only set on specific motor causing error)
//      e: error bit              (set on all motors when any error in mcu)
//      b: busy state
//      o: motor on (not in reset)
//      z: at home
//   2) aaaa aaaa  current position, top 8 bits (might be result of cmd 0x11)
//   3) aaaa aaaa  followed by bottom 8 bits
//   4) cccc cccc  8-bit cksum, sum of first 3 bytes

