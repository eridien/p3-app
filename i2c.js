
/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

const i2cbus = require('i2c-bus');

let bus   = i2cbus.open(3, () => { });
let queue = [];
let qBusy = false;

const chkQueue = () => {
  if (qBusy) return;
  qBusy = true;
  const doOne = () => {
    let req;
    if(!(req = queue.shift())) {
      qBusy = false;
      return;
    }
    let { addr, resolve, reject } = req;
    if(req.write) {
      bus.i2cWrite(addr, req.buf.byteLength, Buffer.from(req.buf),
        err => {
          if(err) reject(err); else resolve();
          doOne();
        });
    }
    else {
      let buf = new Buffer(4);
      bus.i2cRead(addr, 4, buf,
        err => {if (err) reject(err); else resolve(buf) });
    }
  }
  doOne();
}

exports.send = (addr, buf) => {
  return new Promise((resolve, reject) => {
    queue.push({ write:true, addr, buf, resolve, reject });
    chkQueue();
  });
}
exports.recv = (addr) => {
  return new Promise((resolve, reject) => {
    queue.push({ addr, resolve, reject });
    chkQueue();
  });
}


