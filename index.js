
// remote debug under vscode
//   node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js

power = require('./power.js');
plumbing = require('./plumbing.js');

power.init()
plumbing.init();
