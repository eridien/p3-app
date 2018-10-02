
const WebSocket = require('ws');
const motor     = require('./motor');

const wss = new WebSocket.Server({
  port: 3535,
  perMessageDeflate: false,
});

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (message) => {

    let msgObj;
    try {
      msgObj = JSON.parse(message);
    } catch(err) {
      console.log("rpc message parse error:", {err, message});
      const resp = {type: "err", errMsg: "parse error", err, message};
      ws.send(JSON.stringify(resp), (err) => {
        if(err) console.log("rpc parse error send error", {err, message});
      });
      return;
    }

    let promise;
    switch (msgObj.mod) {
      case 'motor': promise = motor.rpc(msgObj); break;
      default: return;
    };

    promise
      .then( (val) => {
        const resp = {id: msgObj.id, type: "res", val};
        ws.send(JSON.stringify(resp), (err) => {
          if(err) console.log("rpc resolve send error", {msgObj, err});
        });
      })
      .catch( (err) => {
        const resp = {id: msgObj.id, type: "rej", err};
        ws.send( JSON.stringify(resp), (err) => {
          if(err) console.log("rpc reject send error", {msgObj, err});
        });
      });
});

const interval = setInterval(function ping() {
  wss.clients.forEach( (ws) => {
    if (ws.isAlive === false) {
      console.log('WebSocket heartbeat failed');
      rpc.clear();
      return ws.terminate();
    }    
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 10000);
