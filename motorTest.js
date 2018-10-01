
const m  = require('./motor');

(async () => {
  console.log('initializing all motors');
  await m.initAllMotors('Y');
  console.log(await m.getStatus('Y'));

  console.log('fakehome');
  await m.fakeHome('Y');
  console.log(await m.getStatus('Y'));

  const tgt = 1000;
  console.log('move', tgt);
  await m.move('Y', tgt);
  console.log(await m.getStatus('Y'));

  console.log('waiting');
  await m.notBusy('Y');
  console.log(await m.getStatus('Y'));

  console.log('done moving, resetting');
  await m.reset('Y');
  console.log(await m.getStatus('Y'));
})()
  .then(  (val) => console.log('test finished, val:', val))
  .catch( (err) => console.log('test error',    err));
