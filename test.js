
const sleep = require('util').promisify(setTimeout);

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

// const init = async () => {
//   try {
//     exp.onSwChg( async (on) => {
//       if(on) {
//         try {
//           let i = 1;
//           while(true) {
//             await exp.setLights(i);
//             i << 1;
//             if(i > 8) i = 1;
//             await sleep(500);
//             if(!exp.swOn())
//               return;
//           }
//         }
//         catch (e) {
//           console.log('exp test error:', e);
//         };
//       }
//       else {      
//         await sleep(1000);
//         await exp.setLights(0x0f);
//       }
//     });
//   }
//   catch (e) {
//     console.log('test error:', e);
//   };
// }

const exp = require('./expander');
const cam = require('./camera');
let wasOn = false;

const init = async () => {
  try {
    exp.onSwChg( async (on) => {
      if(on) {
        cam.focus();
        wasOn = true;
      }
      else { 
        if(wasOn) cam.reset();
      }
    });
  }
  catch (e) {
    console.log('test error:', e);
  };
}

module.exports = {init};
