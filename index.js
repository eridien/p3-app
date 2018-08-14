
// remote debug under vscode
//   node --nolazy --no-warnings --inspect-brk=0.0.0.0:9229 index.js

power = require('./power.js');
plumbing = require('./plumbing.js');
i2c = require('./i2c.js');

power.init()
plumbing.init();
i2c.init()
