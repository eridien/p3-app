/*
to set up i2c ...

1) run raspi-config and enable i2c

2) add this line to /boot/config.txt ...
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1

3) reboot
*/

const I2CBUS = 3;

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
        bus.i2cWrite(addr, req.len, req.buf,
          err => {
            if(err) reject(Object.assign(err, {req}));
            else    resolve();
            doOne();
          });
      }
      else {
        const buf = new Buffer(3);
        bus.i2cRead(addr, 3, buf,
          err => {
            if (err) reject(Object.assign(err, {req}))
            else     resolve(buf);
            doOne();
          }
        )
      }
    }
    else qBusy = false;
  }
  doOne();
}

exports.clrQueue = () =>  (queue = []);

exports.write = (addr, buf, len) => {
  if(addr != 39) console.log('write:', {addr, buf, len});
  if(typeof buf == 'number') buf = [buf];
  buf = Buffer.from(buf);
  if(!len) len = buf.byteLength;
  return new Promise((resolve, reject) => {
    queue.push({ write:true, addr, buf, len, resolve, reject });
    chkQueue();
  });
}

exports.read = (addr) => {
  return new Promise((resolve, reject) => {
    queue.push({ addr, resolve, reject });
    chkQueue();
  });
}
