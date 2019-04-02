
// see i2c.js for i2c setup

/* on raspi -- view video
  modprobe bcm2835-v4l2
  /usr/local/bin/mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 800x600" \
      -o "output_http.so -p 3536 -w /usr/local/share/mjpg-streamer/www"
*/

// start app with remote debug from vscode
/*
  pip3
  cd ~/dev/p3/p3-srvr
  node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js
  (inspect-brk is causing segfault -- use node --nolazy --no-warnings index.js)
*/

console.log('p3 server starting\n');

// const tmp = require('./tempSens');

// const exp = require('./expander');

(async () => {
  try {
    // console.log('init temp sens');
		// await tmp.init();
		// setInterval( async () => {
		// 	const degc = await tmp.readTemp();
		// 	console.log(degc.toFixed(1), ((degc * (9/5)) + 32).toFixed(1));
		// }, 2000);

    // console.log('init expander');
    // await exp.init();
    // console.log('init done');

		// let onOff = false;
		// let buzInt;

    // exp.onSwChg( async (on) => {
    //   if(on) {
		// 		buzInt = setInterval( ()=> {
		// 			exp.setBuzzer(onOff);
		// 			onOff = !onOff;
		// 		}, 1);
		// 		// await exp.setLights(3);
    //     // await exp.setWifiLed(true);
		// 	  // await exp.setMotorLed(true);
		// 		// await exp.setBuzzer(true);
    //   }
    //   else { 
		// 		if(buzInt) clearInterval(buzInt);    
		// 		// await exp.setLights(0);
    //     // await exp.setWifiLed(false); 
		// 	  // await exp.setMotorLed(false);
		// 		// await exp.setBuzzer(false);
    //   }
    // });

    // const mot = require('./motor');
    // mot.reset('F');
    // await mot.init();
    // const cam = require('./camera');
    // await cam.home();

    // const mot = require('./motor');
    // await mot.init();
    // await mot.home('Z');
    // await mot.notBusy('Z');
    // await mot.home('F'); 
    // await mot.notBusy('Z');
    // const tst = require('./test');
    // tst.init();

    const mot = require('./motor');
    await mot.init();
    // const ws = require('./websocket');
    // await ws.init();

    // setInterval( async () => {
    //   console.log( await mot.getMiscState('F') );
    // }, 1000);

  }
  catch (e) {
    console.log('error starting:', e.message);
  };
})();
