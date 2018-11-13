
const m = require('./motor');
// const p = require('./plumbing');

const c = require('./camera');

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
//   await p.init();
//   await p.onOff('pump', true);
//   // await p.onOff('bleed', true);
//   let count = 0;
//   while(true) {
//     const adcVal = await m.getVacSensor();
//     const   inHg = (722-adcVal) / (48/20.8);
//     console.log('inHg: ', inHg.toFixed(1));
//     if(++count == 3)
//       await p.onOff('pump', false);
//     await sleep(2000);
//   }
// })()
//   .then(  (val) => console.log('test finished, val:', val))
//   .catch( (err) => console.log('test error',    err));
/*
     0 "Hg => 577   722
    21 "Hg => 544   678
               33    44
*/  

// (async () => {
//   await c.zoom(50);
// })()
//   .then(  (val) => console.log('test finished, val:', val))
//   .catch( (err) => console.log('test error',    err));

(async () => {
  await m.home('E');
  await sleep(4000);
  await m.fakeHome('F');
  for(let z = 0; z <= 80; z+=.2) {
    const f = c.zoomMmToFocusSteps(z);
    console.log('z:', z.toFixed(1), 'f:', f.toFixed(1));
    await m.move('E', z*40);  // s.b. 'Z' but board broken
    await m.move('F', f);
    await m.notBusy(['E', 'F']);
  }
  await m.home('E');
  await m.move('F', 0);
  await m.notBusy(['E', 'F']);
})()
  .then(  (val) => console.log('test finished, val:', val))
  .catch( (err) => console.log('test error',    err));
