import Matter from 'matter-js';
import { PEN_CONFIGS, Player } from '@/store/gameStore';

export const createPen = (player: Player, x: number, y: number, angle: number, width = 40, height = 160) => {
  const config = PEN_CONFIGS[player.penType] || PEN_CONFIGS['butterflow'];

  // The physics body dimensions MUST match the visual draw size (set by the caller)
  // so clicking anywhere on the drawn pen — including tips and corners — works reliably.
  return Matter.Bodies.rectangle(x, y, width, height, {
    mass: config.weight,
    frictionAir: 0.005,
    friction: 0.1,
    restitution: config.restitution,
    angle,
    label: `player_${player.id}_${player.penType}`,
    render: {
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 0,
      opacity: 0,
    },
  });
};
