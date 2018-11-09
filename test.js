
const m  = require('./motor');
const p  = require('./plumbing');
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

  
  (async () => {
    await p.init();
    await p.pumpOnOff(true);

    while(true) {
      console.log('vac: ', await m.getVacSensor());
      await sleep(2000);
    }
  })()
    .then(  (val) => console.log('test finished, val:', val))
    .catch( (err) => console.log('test error',    err));
  