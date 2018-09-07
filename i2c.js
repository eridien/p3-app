
/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

const pwr = require('./power');

const pify = require('pify');
const sleep = require('util').promisify(setTimeout);

globalBus = require('i2c-bus').open(3, () => { });

i2cReadP = pify(globalBus.i2cRead);
i2cWriteP = pify(globalBus.i2cWrite);

let stateByte;
let lastStateByte = -1;
let lastPos = 0;
let lastPosReported = 0;
let lastErrBit = -1;
let start = Date.now();
let lastTime = start;
let lastSpeed = 0;
let lastAccel = 0;

let getTime = () => ((Date.now() - start) / 1000).toFixed(2);

let chkState = async () => {
  let addr = 8;
  let parseState = (buf) => {
    stateByte = buf[0];
    let pos = ((buf[1] << 8) | buf[2]);
    if(pos > 32767) {
      pos -= 65536;
    }
    let now = Date.now();
    let elapsedSecs = (now - lastTime)/1000;
    let speed = Math.round((  pos - lastPos  ) / elapsedSecs);
    let accel = Math.round((speed - lastSpeed) / elapsedSecs);
    lastTime = now;
    lastPos   = pos;
    lastSpeed = speed;
    lastAccel = accel;
    return {
      time: getTime(),
      // vers: (stateByte >> 7),
      err: errString((stateByte & 0x70) >> 4),
      errBit: (stateByte & 0x08) >> 3,
      busy: (stateByte & 0x04) >> 2,
      motOn: (stateByte & 0x02) >> 1,
      homed: stateByte & 1,
      pos,
      speed,
      accel,
    };
  }
  try {
    let recvBuf = Buffer(4);
    await i2cReadP(addr, recvBuf.length, recvBuf);
    if (recvBuf[3] != ((recvBuf[0] + recvBuf[1] + recvBuf[2]) & 0xff)) {
      console.log('status read cksum error:', recvBuf);
      throw (new Error('cksum error'));
    }
    let state = parseState(recvBuf);
    if (lastStateByte   != stateByte ||
        lastPosReported != state.pos || 
        lastErrBit      != state.errBit) {
      console.log(state);
      console.log();
      lastStateByte   = stateByte;
      lastPosReported = state.pos;
      lastErrBit      = state.errBit;
    }
  } catch (e) {
    console.log('i2c status read error:', e.message);
  }
}

let setOpcode = (opcode) => {
  let cmdBuf = new ArrayBuffer(1);
  let opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  return cmdBuf;
}

let setCmdWord = (word) => {
  let cmdBuf = new ArrayBuffer(2);
  let wordView = new DataView(cmdBuf, 0, 2);
  wordView.setUint16(0, word);
  return cmdBuf;
}

let setCmdWords = (opcode, cmdData) => {
  let cmdBuf = new ArrayBuffer(1 + cmdData.length * 2);
  let opcodeView = new DataView(cmdBuf, 0, 1);
  opcodeView.setUint8(0, opcode);
  let wordsView = new DataView(cmdBuf, 1, cmdData.length * 2);
  for (const [ofs, word] of cmdData.entries()) {
    wordsView.setUint16(ofs * 2, word);
  }
  return cmdBuf;
}
let motorAddr = {
  Y: 0x08,
  x: 0x10,
  x: 0x11,
  x: 0x12,
  x: 0x18,
  x: 0x19,
  x: 0x1a,
  x: 0x1b,
  x: 0x1c,
  x: 0x1d,
}

let opcode = {
  move:        0x8000,
  speedMove:   0x4000,
  startHoming: 0x10,
  getTestPos:  0x11,
  softStop:    0x12,
  softStopRst: 0x13,
  reset:       0x14,
  motorOn:     0x15,
  setHomePos:  0x16,
  settings:    0x1f,
};

// this might collide with main loop i2c
setInterval(chkState, 1000/6);

let path;

exports.test = async (pwrSwOnOff) => {
  let addr = motorAddr.Y;
  let cmdBuf;
  path = [
    [12000, 1000],
    [12000, 1000],
  ];
  try { 
    if (pwrSwOnOff) {
      console.log(getTime(), '============ send settings ============');
      cmdBuf = setCmdWords(opcode.settings, [
               // accel speeds (mm/sec/sec): 0, 200, 400, 600, 800, 1000, 1250, 1500
               // accel values: 0, 8000, 16000, 24000, 32000, 40000, 50000, 60000
            5, // acceleration code
         4000, // default speed
         1200, // start/stop speed limit (30 mm/sec)
        32767, // max pos is 800 mm

         1000, // homing speed (100 mm/sec)
            7, // homing deceleration code
           60, // homing back-up ms->speed (1.5 mm/sec)
           40, // home offset distance: 1 mm
            0, // home pos value, set cur pos to this after homing
            0, // limit sw control
      ]);
      await i2cWriteP(addr, cmdBuf.byteLength, Buffer.from(cmdBuf));
      
      console.log(getTime(), '============ send home-set ============');
      cmdBuf = setOpcode(opcode.setHomePos);
      await i2cWriteP(addr, cmdBuf.byteLength, Buffer.from(cmdBuf));
      
      for(let e of path) {
        let [tgt, delay] = e;
        console.log(getTime(), '============ move to', tgt, '============');
        cmdBuf = setCmdWord(opcode.move + tgt);
        await i2cWriteP(addr, cmdBuf.byteLength, Buffer.from(cmdBuf));
        await sleep(delay);
      }
      console.log(getTime(), '============ start homing ============');
      cmdBuf = setOpcode(opcode.startHoming);
      await i2cWriteP(addr, cmdBuf.byteLength, Buffer.from(cmdBuf));
    }
  } catch (e) {
    chkState(addr);
    console.log('I2C test error:', e.message);
    await sleep(100);
  }
}

errString = (code) => {
  switch (code) {
    case 0: return "";
    case 1: return "motor fault";
    case 2: return "i2c overflow";
    case 3: return "bad command data (first byte invalid or length wrong)";
    case 4: return "command processing took too long";
    case 5: return "speed too fast for MCU";
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
//     aaaa aaaa followed by bottom 8 bits
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
//   -- 21 byte settings command --
//   0001 1111  load settings, 16-bit values
//      acceleration rate table index 0..7 (steps/sec/sec), 0 is off
//      default speed
//      no-acceleration speed limit (and start speed when stopped)
//      max pos     (min pos is always zero))
//      homing speed
//      homing decelleration rate table index 0..7 
//      homing back-up speed
//      home offset distance
//      home pos value (set cur pos to this value after homing, usually 0)
//      limit sw control

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

