
const mot = require('./motor');
const cv = require('opencv4nodejs');
const exp = require('./expander');
const sleep = require('util').promisify(setTimeout);

const devicePort = '/dev/video0';
const capVid = false;
const jogDist = 10;
let dir = 0;
const burnCnt = 50;
const numSamples = 2;
let graphBase = 0;
const graphMul  = 20;
const histSize = 10;

const zoomPos  = [0,  1000,  2000,   3000,   3100,   3200,   3300,   3350,   3375,   3400,   3425];
const focusPos = [0, -2000, -5000, -19000, -22000, -29000, -38000, -44000, -48500, -55000, -61000];

const zoomMmToFocusSteps = (zoomInMM) => {
  const z = Math.max(Math.min(zoomInMM * 40, 3425), 0);
  let idx;
  for(idx = zoomPos.length-2; idx > 0; idx--) if(z >= zoomPos[idx]) break;
  const frac = (z-zoomPos[idx]) / (zoomPos[idx+1]-zoomPos[idx]);
  return (focusPos[idx] + frac * (focusPos[idx+1] - focusPos[idx]));
}

let vCap;

const getFrameBlur = async () => {
  if(!vCap) vCap = new cv.VideoCapture(devicePort);
  if(burnCnt) {
    for(let i=0; i< burnCnt; i++) {
      if(!vCap) return 0;
      await vCap.readAsync();
    }
  }
  let sum = 0;
  for(let i=0; i<numSamples; i++) {
    if(!vCap) return 0;
    const frame = await vCap.readAsync();
    const meanStdDev   = frame.meanStdDev();
    const stdDevArray  = meanStdDev.stddev.getDataAsArray();
    const stdDeviation = stdDevArray[0];
    const res = stdDeviation ** 2; 
    sum += res;
  }
  return sum/numSamples;
}

const focus = async () => {
  // mot.home('Z');
  const hist = [];
  while(exp.swOn()) {
    const s = await mot.getStatus('F');
    if(capVid) {
      const blur = await getFrameBlur();
      hist.push(blur);
      let lft = rgt = 0;
      if(hist.length == histSize) {
        for(let i=0;          i < histSize/2; i++) lft += hist[i];
        for(let i=histSize/2; i < histSize;   i++) rgt += hist[i];
        hist.shift();
      }
      h=`${dir?'^':'v'} ${s.pos} ` +
        `${(rgt-lft) > 0 ? '^':'v'} ${Math.round(lft)} ${Math.round(rgt)} ${Math.round(blur)}  `;
      while(h.length < 28) h += ' ';
      if(graphBase == 0) graphBase = blur - 300;
      for(let i=0; i < (blur-graphBase); i += graphMul) h += '*';
      console.log(h);
    }
    else
      console.log(`${dir?'^':'v'} ${s.pos}`);
    await mot.jog('F', dir, jogDist);
    await mot.notBusy('F');
    // await sleep(1000);
  }
}

const reset = async () => {
  dir = 1-dir;
  console.log();
  if(capVid) {
    console.log('releasing vCap');
    if(vCap) vCap.release();
    vCap = null;
  }
  // process.exit();
}

const home = async () => {
  mot.home('Z');
  focusPos();
}

module.exports = {home, focus, reset};

