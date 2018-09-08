
/*
/boot/config.txt
/boot/overlays/README
dtoverlay=i2c-gpio,bus=3,i2c_gpio_sda=2,i2c_gpio_scl=3,i2c_gpio_delay_us=1
*/

import * as i2cbus from 'i2c-bus';

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
    let { motor, resolve, reject } = req;
    if(req.write) {
      bus.i2cWrite(motors[motor].i2cAddr, req.buf.length, Buffer.from(req.buf),
        err => {
          if(err) reject(err); else resolve();
          doOne();
        });
    }
    else {
      let buf = new Buffer(4);
      bus.i2cRead(motors[motor].i2cAddr, 4, buf,
        err => {if (err) reject(err); else resolve(buf) });
    }
  }
  doOne();
}

export const send = (motor, buf) => {
  return new Promise((resolve, reject) => {
    queue.push({ motor, write:true, buf, resolve, reject });
    chkQueue();
  });
}
export const recv = (motor) => {
  return new Promise((resolve, reject) => {
    queue.push({ motor, resolve, reject });
    chkQueue();
  });
}


