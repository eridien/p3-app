
const mot = require('./motor');
const cv = require('opencv4nodejs');
const exp = require('./expander');
const sleep = require('util').promisify(setTimeout);

const devicePort = '/dev/video0';
const capVid = false;
const jogDist = 50;
let dir = 0;
const burnCnt = 10;
const numSamples = 2;
const graphBase = 1000;
const graphMul  = 5;

const zoomPos  = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200];
const focusPos = [800, 1100, 1400, 1800, 2200, 2800, 4300, 6350, 11200];

let cameraHomed = false;

const zoomMmToFocusSteps = (zoomInMM) => {
  const z = Math.max(Math.min(zoomInMM * 40, 3200), 0);
  let idx;
  for(idx = zoomPos.length-2; idx > 0; idx--)
    if(z >= zoomPos[idx]) break;
  const frac = (z-zoomPos[idx]) / (zoomPos[idx+1]-zoomPos[idx]);
  return (focusPos[idx] + frac * (focusPos[idx+1] - focusPos[idx]));
}

let vCap;

const getFrameBlur = async () => {
  if(capVid) {
    if(!vCap) vCap = new cv.VideoCapture(devicePort);
    let lastT = Date.now();
    for(let i=0; i< burnCnt; i++) {
      await vCap.readAsync();
      const now = Date.now();
      // console.log(now-lastT);
      lastT = now;
    }
    let sum = 0;
    for(let i=0; i<numSamples; i++) {
      const frame = await vCap.readAsync();
      const meanStdDev   = frame.meanStdDev();
      const stdDevArray  = meanStdDev.stddev.getDataAsArray();
      const stdDeviation = stdDevArray[0];
      sum += stdDeviation ** 2;
    }
    return sum/numSamples;
  }
  else await sleep(1000);
  return 0;
}

const focus = async () => {
  // mot.home('Z');
  let firstBlur = 0;
  let lastBlur = 0;
  let lastTime = Date.now();
  let maxBlur = 0;
  let minBlur = Math.min();
  while(exp.swOn()) {
    const blur = await getFrameBlur();
    if (!firstBlur) firstBlur = blur;
    maxBlur = Math.max(blur, maxBlur);
    minBlur = Math.min(blur, minBlur);
    const now = Date.now();
    const s = await mot.getStatus('F');
    // console.log(s);
    
    h=`${dir?'^':'v'} ${s.pos} ${Math.round(blur)}  `;
    while(h.length < 15) h += ' ';
    for(let i=0; i < (blur-graphBase); i += graphMul) 
      h += '*';
    console.log(h);
    // console.log(dir, now-lastTime,
    //               s.pos, 
    //               blur.toFixed(1), 
    //               minBlur.toFixed(1),
    //               maxBlur.toFixed(1),
    //              (blur-firstBlur).toFixed(1), 
    //              (blur-lastBlur).toFixed(1));
    lastTime = now;
    lastBlur = blur;
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

