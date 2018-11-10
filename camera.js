

const m  = require('./motor');

const zoomMotor  = 'E';  // debug for broken board -- s.b. 'Z'
const focusMotor = 'F'; 

let cameraHomed = false;

const home = async () => {
  if(cameraHomed) return;
  await m.home(zoomMotor);
  cameraHomed = true;
}

const zoom = async (mm) => {
  home();
  m.move(zoomMotor, m.mmToSteps(zoomMotor, mm));
}


module.exports = {zoom};
