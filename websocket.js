
const WebSocket = require('ws');
const motor     = require('./motor');

const wss = new WebSocket.Server({
  port: 3535,
  perMessageDeflate: false,
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {ws.isAlive = true});

  ws.on('message', (message) => {

    let msgObj;
    try {
      msgObj = JSON.parse(message);
    } catch(err) {
      console.error("rpc message parse error:", {err, message});
      const resp = {type: "err", errMsg: "parse error", err, message};
      ws.send(JSON.stringify(resp), (err) => {
        if(err) console.error("rpc parse error send error", {err, message});
      });
      return;
    };

    let promise;
    switch (msgObj.mod) {
      case 'motor': promise = motor.rpc(msgObj); break;
      default: return;
    };
    if(promise) promise
      .then( (val) => {
        const resp = {id: msgObj.id, type: "res", val};
        ws.send(JSON.stringify(resp), (err) => {
          if(err) console.error("rpc resolve send error", {msgObj, err});
        });
      })
      .catch( (err) => {
        let resp = {id: msgObj.id, type: "rej", err};
        ws.send( JSON.stringify(resp), (err) => {
          if(err) console.error("rpc reject send error", {msgObj, err});
        });
      });
  });
});

setInterval( () => {
  wss.clients.forEach( (ws) => {
    if (ws.isAlive === false) {
      console.log('WebSocket heartbeat failed');
      ws.terminate();
      return;
    };
    ws.isAlive = false;
    ws.ping(() => {});
  })}, 10000);
