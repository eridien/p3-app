
// const c = require('./camera');
// const sleep = require('util').promisify(setTimeout);
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
  
const m = require('./motor');

const init = async () => {
  await m.initAllMotors();
  await m.reset('Z');
  await m.reset('F');
  await m.notBusy(['Z', 'F']);
}

const run = async () => {
  try {
      await m.home('Z');
      await m.fakeHome('F');
      await m.notBusy(['Z', 'F']);
      await m.move('F', 32000);
  }
  catch (e) {
    console.log('test error:', e);
  }
}

const stop = async () => {
  try {
    await m.reset('Z');
    await m.reset('F');
  }
  catch (e) {
    console.log('test error:', e);
  }
}

module.exports = {init, run, stop};
