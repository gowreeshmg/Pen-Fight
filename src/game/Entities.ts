import Matter from 'matter-js';
import { PenType, PEN_CONFIGS, Player } from '@/store/gameStore';

export const createPen = (x: number, y: number, player: Player, angle: number = 0) => {
  const config = PEN_CONFIGS[player.penType];
  
  // Physics body matches the new wider visual representation
  const width = 60;
  const height = 240;

  const penOptions = {
    mass: config.weight,
    frictionAir: 0.005, // static base air friction
    friction: 0.1, // static base table friction
    restitution: config.restitution,
    angle,
    label: `player_${player.id}_${player.penType}`,
    render: {
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 0,
      opacity: 0,
    },
  };

  if (player.penType === 'hero') {
    const bodyPart = Matter.Bodies.rectangle(x, y, width, height - 40, { mass: config.weight * 0.3 });
    const capPart = Matter.Bodies.rectangle(x, y - (height / 2) + 20, width + 8, 40, { mass: config.weight * 0.7 });
    return Matter.Body.create({
      ...penOptions,
      parts: [bodyPart, capPart],
    });
  }

  return Matter.Bodies.rectangle(x, y, width, height, penOptions);
};
