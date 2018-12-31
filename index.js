
// see i2c.js for i2c setup

/* on raspi view video
  modprobe bcm2835-v4l2
  /usr/local/bin/mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 800x600" \
      -o "output_http.so -p 3536 -w /usr/local/share/mjpg-streamer/www"
*/

// start app with remote debug from vscode
/*
  pip3
  cd ~/dev/p3/p3-srvr
  node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js
*/

console.log('p3 server started\n');

const   exp = require('./expander');
const test  = require('./test');
const sleep = require('util').promisify(setTimeout);
(async () => {
  try {
    await exp.init();
    await test.init();
    exp.onSwChg( async (on) => {
      if(on) {
        let count = 0;
        while(++count < 8) {
          await exp.setWifiLed(count & 1);
          await sleep(100);
        }
        await test.run();
      }
      else {      
        await test.stop();
      }
    });
  }
  catch (e) {
    console.log('index.js error:', e);
  };
})();

// require('./websocket');
