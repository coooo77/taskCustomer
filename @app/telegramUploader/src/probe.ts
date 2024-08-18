'use strict';
import robot from 'robotjs';
import { wait } from '@util/utils';

function getPosition() {
  const mouse = robot.getMousePos();
  console.log(
    'Mouse is at x:' + mouse.x + ' y:' + mouse.y,
    'color: ',
    robot.getPixelColor(mouse.x, mouse.y),
  );
}

(async () => {
  let count = 0;
  do {
    getPosition();
    await wait(500);
  } while (++count < 1000);
})();
