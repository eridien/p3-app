
const mot = require('./motor');
const cv = require('opencv4nodejs');
const exp = require('./expander');
const sleep = require('util').promisify(setTimeout);

const devicePort = '/dev/video0';
const capVid = true;
let dir = 0;

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
const burnCnt = 2;
const numSamples = 2;

const getFrameBlur = async () => {
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

let graphBase;
const graphMul  = 20;
const jogDist = 50;
const numSteps = 500;

const autoFocus = async () => {
  let s, maxFocusPos;
  let maxFocusVal = Math.max();
  const startPos = (s = await mot.getStatus('F')).pos;
  while(s.pos > startPos-numSteps) {
    if(capVid) {
      const blur = await getFrameBlur();
      if(blur > maxFocusVal) {
        maxFocusPos = s.pos;
        maxFocusVal = blur;
        // console.log('pos,val:', maxFocusPos, maxFocusVal);
      }
      h=`${dir?'^':'v'} ${s.pos} ${Math.round(blur)}  `;
      while(h.length < 15) h += ' ';
      if(!graphBase) graphBase = blur - 300;
      for(let i=0; i < (blur-graphBase); i += graphMul) h += '*';
      console.log(h);
    }
    else
      console.log(`${dir?'^':'v'} ${s.pos}`);
    await mot.jog('F', dir, jogDist);
    await mot.notBusy('F');
    s = await mot.getStatus('F');
  }
  console.log('maxFocusPos:', maxFocusPos);
  await mot.move('F', maxFocusPos, 4000);
}

const typFocusPos = 10500;

const home = async () => {
  if(capVid) 
    vCap = await new cv.VideoCapture(devicePort);
  await mot.home('Z');
  await mot.home('F');
  await mot.notBusy('F');
  // 
  await mot.move('F', typFocusPos + numSteps/2, 4000);
  await mot.notBusy(['F', 'Z']);
  await autoFocus();
  if(vCap) await vCap.release();
  await sleep(1000);
  process.exit(0);
}

module.exports = {home, autoFocus};

