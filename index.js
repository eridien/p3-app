
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

const   exp = require('./expander');

console.log('p3 server starting\n');

(async () => {
  try {
    await exp.init();
    exp.onSwChg( async (on) => {
      if(on) {
        await exp.setWifiLed(true);
      }
      else {     
        await exp.setWifiLed(false); 
      }
    });
  }
  catch (e) {
    console.log('error starting:', e);
  };
})();

require('./test');

// require('./websocket');
