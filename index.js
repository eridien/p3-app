
// see i2c.js for i2c setup
// see plumbing.js for GPIO setup

// start app with remote debug from vscode
/*
  pip3
  cd ~/dev/p3/p3-srvr
  node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js
*/

// require('./test');

require('./websocket');
