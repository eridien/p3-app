
// const cv = require('opencv4nodejs');
const sleep = require('util').promisify(setTimeout);

const zoom  = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200];
const focus = [800, 1100, 1400, 1800, 2200, 2800, 4300, 6350, 11200];

let cameraHomed = false;

const zoomMmToFocusSteps = (zoomInMM) => {
  const z = Math.max(Math.min(zoomInMM * 40, 3200), 0);
  let idx;
  for(idx = zoom.length-2; idx > 0; idx--)
    if(z >= zoom[idx]) break;
  const frac = (z-zoom[idx]) / (zoom[idx+1]-zoom[idx]);
  return (focus[idx] + frac * (focus[idx+1] - focus[idx]));
}

// let vCap = [];

// const getFrameBlur = async (devicePort) => {
//   if(!vCap[devicePort]) 
//     vCap[devicePort] = new cv.VideoCapture(devicePort);
//   let frame = await vCap[devicePort].readAsync();
//   // cv.imshow('getFrameBlur debug window', frame);
//   frame = frame.laplacian(8);
//   const meanStdDev   = frame.meanStdDev();
//   const stdDevArray  = meanStdDev.stddev.getDataAsArray();
//   const stdDeviation = stdDevArray[0];
//   return stdDeviation ** 2;
// }

// const reset_vCap = async (devicePort) => {
//   if(vCap[devicePort]) 
//     await vCap[devicePort].resetAsync();
//   delete vCap[devicePort];
// }

module.exports = {zoomMmToFocusSteps};//, getFrameBlur, reset_vCap};

