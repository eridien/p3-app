
const mot = require('./motor');
const cv = require('opencv4nodejs');
const sleep = require('util').promisify(setTimeout);

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

let vCap = [];

const getFrameBlur = async (devicePort) => {
  if(!vCap[devicePort]) 
    vCap[devicePort] = new cv.VideoCapture(devicePort);
  let frame = await vCap[devicePort].readAsync();
  // cv.imshow('getFrameBlur debug window', frame);
  frame = frame.laplacian(8);
  const meanStdDev   = frame.meanStdDev();
  const stdDevArray  = meanStdDev.stddev.getDataAsArray();
  const stdDeviation = stdDevArray[0];
  return stdDeviation ** 2;
}

const reset_vCap = async (devicePort) => {
  if(vCap[devicePort]) 
    await vCap[devicePort].resetAsync();
  delete vCap[devicePort];
}

const focus = async () => {
  console.log(await getFrameBlur('/dev/video0'));
  await reset_vCap('/dev/video0');
}

const home = async () => {
  mot.home('Z');
  focusPos();
}

module.exports = {home, focus};

