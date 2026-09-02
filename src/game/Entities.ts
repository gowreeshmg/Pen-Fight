import Matter from 'matter-js';
import { PenType, PEN_CONFIGS, Player } from '@/store/gameStore';

export const createPen = (player: Player, x: number, y: number, angle: number, width = 40, height = 160) => {
  const config = PEN_CONFIGS[player.penType] || PEN_CONFIGS['butterflow'];
  
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
    const bodyPart = Matter.Bodies.rectangle(x, y, width, height - 20, { mass: config.weight * 0.3 });
    const capPart = Matter.Bodies.rectangle(x, y - (height / 2) + 10, width + 4, 20, { mass: config.weight * 0.7 });
    return Matter.Body.create({
      ...penOptions,
      parts: [bodyPart, capPart],
    });
  }

  return Matter.Bodies.rectangle(x, y, width, height, penOptions);
};
