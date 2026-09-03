import Matter from 'matter-js';
import { PenType, PEN_CONFIGS, Player } from '@/store/gameStore';

export const createPen = (player: Player, x: number, y: number, angle: number, width = 40, height = 160) => {
  const config = PEN_CONFIGS[player.penType] || PEN_CONFIGS['butterflow'];

  // All pens use a single rectangle body for reliable hit detection.
  // The visual appearance is rendered separately on Canvas and doesn't affect the physics shape.
  // Pen-specific sizes:
  const sizes: Partial<Record<PenType, { w: number; h: number }>> = {
    hero:      { w: 44, h: 165 },  // slightly wider/taller for the fountain pen body
    parker:    { w: 38, h: 170 },  // long and heavy
    pinpoint:  { w: 34, h: 155 },  // thin and light
    v7:        { w: 34, h: 150 },  // thin and very light
    butterflow:{ w: 38, h: 158 },
    trimax:    { w: 40, h: 162 },
    gripper:   { w: 42, h: 160 },
  };
  const size = sizes[player.penType] || { w: width, h: height };

  return Matter.Bodies.rectangle(x, y, size.w, size.h, {
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
