/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

let I2CBUS = 3;

const i2cbus = require('i2c-bus');
const bus = i2cbus.open(I2CBUS, () => {});

let queue = [];
let qBusy = false;

const chkQueue = () => {
  if (qBusy) return;
  qBusy = true;
  const doOne = () => {
    let req;
    if(req = queue.shift()) {
      const { addr, resolve, reject } = req;
      if(req.write) {
        bus.i2cWrite(addr, req.buf.byteLength, Buffer.from(req.buf),
          err => {
            if(err) {reject(err)} else resolve();
            doOne();
          });
      }
      else {
        const buf = new Buffer(4);
        bus.i2cRead(addr, 4, buf,
          err => {
            if (err) reject(err); else resolve(buf);
            doOne();
          });
      }
    }
    else qBusy = false;
  }
  doOne();
}

exports.cmd = (addr, buf) => {
  return new Promise((resolve, reject) => {
    queue.push({ write:true, addr, buf, resolve, reject });
    chkQueue();
  });
}
exports.status = (addr) => {
  return new Promise((resolve, reject) => {
    queue.push({ addr, resolve, reject });
    chkQueue();
  });
}


