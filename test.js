
const sleep = require('util').promisify(setTimeout);
const exp = require('./expander');

// const c = require('./camera');
// 
// let time = Date.now();
// 
// (async () => {
//   while(true) {
//     console.log(
//       (await c.getFrameBlur(0)).toFixed(0),
//       Date.now() - time
//     );
//     time = Date.now();
//     // await sleep(1000);
//   }
// })().then( () => console.log('done') );
  
// const m = require('./motor');

// const init = async () => {
//   await m.initAllMotors();
//   await m.reset('Z');
//   await m.reset('F');
//   await m.notBusy(['Z', 'F']);
// }

// const run = async () => {
//   try {
//       await m.home('Z');
//       await m.fakeHome('F');
//       await m.notBusy(['Z', 'F']);
//       await m.jog('F', 0, 1000);
//   }
//   catch (e) {
//     console.log('test error:', e);
//   }
// }

// const stop = async () => {
//   try {
//     await m.reset('Z');
//     await m.reset('F');
//   }
//   catch (e) {
//     console.log('test error:', e);
//   }
// }

const init = async () => {
}

const run = async () => {
  try {
    for(let i=0;;i++) {
      await exp.setLights(i);
      await sleep(200);
      if(!exp.swOn())
        return;
    }
  }
  catch (e) {
    console.log('exp test error:', e);
  };
}

const stop = async () => {
  await sleep(1000);
  await exp.setLights(0x0f);
}

(async () => {
  try {
    init();
    exp.onSwChg( async (on) => {
      if(on) {
        await run();
      }
      else {      
        await stop();
      }
    });
  }
  catch (e) {
    console.log('test error:', e);
  };
})();


