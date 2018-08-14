class Device {
  // bus is i2c-bus bus object
  constructor(bus, address, opts) {
    this.bus = bus
    this.address = address
    if (opts) {
      this.id = opts.id // must be unique within a bus
      this.desc = opts.desc
    }
  }

  readRaw(length, buffer) {
    return this.bus.readRaw(this.address, length, buffer)
  }

  writeRaw(length, buffer) {
    return this.bus.writeRaw(this.address, length, buffer)
  }

  read(cmd) {
    return this.bus.read(this.address, cmd)
  }

  write(cmd, byte) {
    return this.bus.write(this.address, cmd, byte)
  }

  read2(cmd) {
    return this.bus.read2(this.address, cmd)
  }

  write2(cmd, bytes) {
    return this.bus.write2(this.address, cmd, bytes)
  }

}

module.exports = Device;
