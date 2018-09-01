
// start app with remote debug from vscode
/*
  pi
  cd ~/dev/p3/app
  node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js
*/
power = require('./power.js');
plumbing = require('./plumbing.js');
i2c = require('./i2c.js');
