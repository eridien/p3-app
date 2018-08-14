const i2c = require('i2c-bus'),
  pify = require('pify'),
  PQueue = require('p-queue')

class Bus {

  constructor(busnum = 1) {
    this.busnum = busnum
    this.queue = new PQueue({ concurrency: 1 });
    this.qAdd = (p) => { this.queue.add(() => p) } // p is a promise
    this.bus = i2c.open(this.busnum, () => { })
  }

  scan() { return pify(this.bus.scan).bind(this.bus)() }
  close() { return pify(this.bus.close).bind(this.bus)() }

  readRaw(address, length, buffer) {
    return pify(this.bus.i2cRead).bind(this.bus)(address, length, buffer)
  }

  writeRaw(address, length, buffer) {
    return pify(this.bus.i2cWrite).bind(this.bus)(address, length, buffer)
  }

  read(address, cmd) {
    // console.log("read: address, cmd", address, cmd)
    return pify(this.bus.readByte).bind(this.bus)(address, cmd)
  }

  write(address, cmd, byte) {
    // console.log("write: address, cmd, byte", address, cmd, byte)
    return pify(this.bus.writeByte.bind(this.bus))(address, cmd, byte)
  }

  read2(address, cmd) {
    return pify(this.bus.readWord.bind(this.bus))(address, cmd)
  }

  write2(address, cmd, bytes) {
    return pify(this.bus.writeWord.bind(this.bus))(address, cmd, bytes)
  }

} // end of Bus Class

module.exports = Bus;
