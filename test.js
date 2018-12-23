
const m = require('./motor');
const c = require('./camera');
const exp = require('./exp');

const sleep = require('util').promisify(setTimeout);

// (async () => {
//   console.log('initializing all motors');
//   await m.initAllMotors('Y');
//   console.log(await m.getStatus('Y'));

//   console.log('fakehome');
//   await m.fakeHome('Y');
//   console.log(await m.getStatus('Y'));

//   const tgt = 1000;
//   console.log('move', tgt);
//   await m.move('Y', tgt);
//   console.log(await m.getStatus('Y'));

//   console.log('waiting');
//   await m.notBusy('Y');
//   console.log(await m.getStatus('Y'));

//   console.log('done moving, resetting');
//   await m.reset('Y');
//   console.log(await m.getStatus('Y'));
// })()
//   .then(  (val) => console.log('test finished, val:', val))
//   .catch( (err) => console.log('test error',    err)); 

// (async () => {
//   await m.sendSettings('F', {homePosVal: 800});
//   await m.home('E');
//   await m.fakeHome('F');
//   await m.notBusy(['E', 'F']);
//   for(let z = 0; z <= 80; z+=.05) {
//     const f = c.zoomMmToFocusSteps(z);
//     console.log('z:', z.toFixed(1), 'f:', f.toFixed(1));
//     await m.move('E', z*40);  // s.b. 'Z' but board broken
//     await m.move('F', f);
//     await m.notBusy(['E', 'F']);
//   }
//   await m.home('E');
//   await m.move('F', 800);
//   await m.notBusy(['E', 'F']);
//   // await m.reset('F');
// })()
//   .then(  (val) => console.log('test finished, val:', val))
//   .catch( (err) => console.log('test error',    err));

  // (async () => {
  //   await m.sendSettings('E', {speed: 6000});
  //   await m.sendSettings('F', {speed: 16000, homePosVal: 800});
  //   await m.home('E');
  //   await m.notBusy(['E', 'F']);
  //   await m.fakeHome('F');
  //   await m.notBusy(['E', 'F']);

  //   const z = 75;
  //   const f = c.zoomMmToFocusSteps(z);
  //   console.log('z:', z.toFixed(1), 'f:', f.toFixed(1));
  //   await m.move('E', z*40);  // s.b. 'Z' but board broken
  //   await m.move('F', f);
  //   await m.notBusy(['E', 'F']);
  //   await sleep(2000);

  //   await m.home('E');
  //   await m.move('F', 800);
  //   await m.notBusy(['E', 'F']);
  // })()
  //   .then(  (val) => console.log('test finished, val:', val))
  //   .catch( (err) => console.log('test error',    err));
  
  // let time = Date.now();

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
  
let on;
(async () => {
  await exp.init();
  await exp.init();
  on = await exp.swOn();
})().then( () => console.log('switch on:', on) );
