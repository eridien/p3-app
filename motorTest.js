
const m  = require('./motor');

(async () => {
  console.log('initializing all motors');
  await m.initAllMotors('Y');
  
  console.log(await m.getStatus('Y'));
  console.log('fakehome');
  await m.fakeHome('Y');

  const tgt = 30000;
  console.log(await m.getStatus('Y'));
  console.log('move', tgt);
  await m.move('Y', tgt);

  console.log(await m.getStatus('Y'));
  console.log('waiting');
  await m.notBusy('Y');
  
  console.log(await m.getStatus('Y'));
  console.log('done moving');
})()
  .then(  (val) => console.log('test finished, val:', val))
  .catch( (err) => console.log('test error',    err));
