
const m     = require('./motor');
const p     = require('./plumbing');
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
    await p.onOff('pump', true);
    // await p.onOff('bleed', true);
    let count = 0;
    while(true) {
      const adcVal = await m.getVacSensor();
      const   inHg = (722-adcVal) / (44/20.75);
      console.log('inHg: ', inHg.toFixed(1));
      if(++count == 2)
        await p.onOff('pump', false);
      await sleep(2000);
    }
  })()
    .then(  (val) => console.log('test finished, val:', val))
    .catch( (err) => console.log('test error',    err));
  
/*
       0 "Hg => 577   722
      21 "Hg => 544   678
                 33    44
*/