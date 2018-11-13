
// see i2c.js for i2c setup
// see plumbing.js for GPIO setup

// start app with remote debug from vscode
/*
  piz
  cd ~/dev/p3/p3-srvr
  node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js
*/

console.log('p3 server started');

require('./test');

// require('./websocket');
