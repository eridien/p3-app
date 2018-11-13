

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

module.exports = {zoomMmToFocusSteps};
