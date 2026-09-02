'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { useGameStore, ARENA_CONFIGS, PenType, PEN_CONFIGS } from '@/store/gameStore';
import { createPen } from '@/game/Entities';
import { SlingshotMechanic } from '@/game/Mechanics';

const PEN_IMAGE_SOURCES: Record<string, string> = {
  gripper:    '/pens/gripper.png',
  parker:     '/pens/parker.png',
  butterflow: '/pens/butterflow.png',
  hero:       '/pens/hero.png',
  pinpoint:   '/pens/pinpoint.png',
  trimax:     '/pens/trimax.png',
  v7:         '/pens/v7.png',
};

const PLAYER_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6'];

type PenBody = { body: Matter.Body; penType: string; playerId: number };

export default function MatterEngine() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const slingshotRef = useRef<SlingshotMechanic | null>(null);
  const penImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const deskImageRef = useRef<HTMLImageElement | null>(null);
  const penBodiesRef = useRef<PenBody[]>([]);
  const currentTurnRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const { players, selectedArena, currentTurn, nextTurn, eliminatePlayer } = useGameStore();
  const [power, setPower] = useState(0);
  const [trajectory, setTrajectory] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null; }>({ start: null, end: null });
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  
  const turnPendingRef = useRef(false);

  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);

  const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.src = src; });

  useEffect(() => {
    // Attempt to lock screen orientation to portrait on mobile devices
    if (screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock('portrait-primary').catch(() => {
        // Silently fail if not supported or not in fullscreen
      });
    }

    if (!sceneRef.current || players.length === 0) return;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;
    canvasSizeRef.current = { width, height };

    const uniquePens = [...new Set(players.map((p) => p.penType))];
    const arenaConfig = ARENA_CONFIGS[selectedArena];

    // Load specific arena texture + pen images
    Promise.all([
      loadImage(arenaConfig.bgImage).then((img) => { deskImageRef.current = img; }),
      ...uniquePens.map((t) => loadImage(PEN_IMAGE_SOURCES[t]).then((img) => { penImagesRef.current[t] = img; })),
    ]);

    const newEngine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    const world = newEngine.world;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: newEngine,
      options: { width, height, wireframes: false, background: arenaConfig.color },
    });
    render.canvas.style.position = 'absolute';
    render.canvas.style.top = '0';
    render.canvas.style.left = '0';
    render.canvas.style.zIndex = '10';

    // REMOVED WALL BOUNDARIES - Pens can now fall off the edge!

    // Responsive spawns: if on mobile (portrait), spawn top and bottom. If desktop (landscape), spawn left and right.
    const isPortrait = height > width;
    
    // Spawn at a fixed safe distance from the edge so pens never spawn already falling off.
    const safeX = Math.min(100, width * 0.15);
    const safeY = Math.min(120, height * 0.2);

    const spawns = isPortrait 
      ? [
          { x: width / 2, y: height - safeY, angle: Math.PI / 2 }, // Player 1 at bottom, sideways
          { x: width / 2, y: safeY, angle: -Math.PI / 2 }, // Player 2 at top, sideways
          { x: safeX, y: height / 2, angle: Math.PI / 2 },
          { x: width - safeX, y: height / 2, angle: -Math.PI / 2 },
        ]
      : [
          { x: safeX, y: height / 2, angle: 0 }, // Player 1 on left, vertical
          { x: width - safeX, y: height / 2, angle: Math.PI }, // Player 2 on right, vertical
          { x: width / 2, y: safeY, angle: Math.PI },
          { x: width / 2, y: height - safeY, angle: 0 },
        ];

    const penW = 60; // Wide enough to press easily on all devices
    const penH = isPortrait ? 160 : 240; // Shorter on mobile so they don't overlap

    penBodiesRef.current = [];
    players.forEach((player, i) => {
      if (i < spawns.length) {
        const pen = createPen(player, spawns[i].x, spawns[i].y, spawns[i].angle, penW, penH);
        Matter.Composite.add(world, pen);
        penBodiesRef.current.push({ body: pen, penType: player.penType, playerId: player.id });
      }
    });

    Matter.Events.on(newEngine, 'beforeUpdate', () => {
      Matter.Composite.allBodies(world).forEach((body) => {
        if (!body.isStatic) {
          // Realistic Friction: Damping (air/table sliding) + Kinetic Friction (grip)
          const labelParts = body.label.split('_');
          const penType = labelParts.length > 2 ? (labelParts[2] as PenType) : 'butterflow';
          const stats = PEN_CONFIGS[penType] || PEN_CONFIGS['butterflow'];

          const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
          if (speed > 0.05) {
            // Apply gripMultiplier from the pen's individual stats
            const frictionDrop = (arenaConfig.kineticFriction * stats.gripMultiplier) + (speed * arenaConfig.tableFriction);
            const newSpeed = Math.max(0, speed - frictionDrop);
            const factor = newSpeed / speed;
            Matter.Body.setVelocity(body, { x: body.velocity.x * factor, y: body.velocity.y * factor });
          } else {
            Matter.Body.setVelocity(body, { x: 0, y: 0 }); // Hard stop at very low speeds
          }

          const angSpeed = Math.abs(body.angularVelocity);
          if (angSpeed > 0.005) {
            // Angular friction should be much lower than linear friction so spins don't die instantly!
            const newAngSpeed = Math.max(0, angSpeed - (arenaConfig.kineticFriction * 0.003) - (angSpeed * arenaConfig.tableFriction * 0.5));
            Matter.Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * newAngSpeed);
          } else {
            Matter.Body.setAngularVelocity(body, 0);
          }
        }
      });
    });

    Matter.Events.on(newEngine, 'afterUpdate', () => {
      const { width: W, height: H } = canvasSizeRef.current;
      [...penBodiesRef.current].forEach(({ body, playerId }) => {
        const { x, y } = body.position;
        // Detection boundary is EXACTLY the screen edge.
        // If the center of the pen (x, y) crosses the edge, it means half of it is off the bench, 
        // so gravity takes over and it falls!
        if (x < 0 || x > W || y < 0 || y > H) {
          Matter.World.remove(world, body);
          penBodiesRef.current = penBodiesRef.current.filter((p) => p.playerId !== playerId);
          eliminatePlayer(playerId);
          setEliminated((prev) => {
            const next = [...prev, playerId];
            return next;
          });
        }
      });

      // Check for winner and handle deferred turns ONLY when all pens have come to a complete rest.
      let isMoving = false;
      [...penBodiesRef.current].forEach(({ body }) => {
        if (body.speed > 0.1 || Math.abs(body.angularVelocity) > 0.1) isMoving = true;
      });

      if (!isMoving) {
        if (turnPendingRef.current) {
          turnPendingRef.current = false;
          nextTurn();
        }

        if (winner === null) {
          setEliminated((prev) => {
            const alive = players.filter((p) => !prev.includes(p.id));
            if (alive.length === 1 && players.length > 1) {
              setWinner(alive[0].id);
            } else if (alive.length === 0 && players.length > 1) {
              setWinner(-1); // -1 signifies a DRAW
            }
            return prev;
          });
        }
      }
    });

    Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const desk = deskImageRef.current;
      
      if (desk) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        if (arenaConfig.filter) ctx.filter = arenaConfig.filter;
        
        ctx.drawImage(desk, 0, 0, width, height);
        ctx.filter = 'none';

        // The desk can now be its natural brightness because we have true transparent PNGs!
        // (No more lightening the desk for multiply blend hack)

        // Very slight vignette
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.9);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const activePlayerId = players[currentTurnRef.current]?.id;

      penBodiesRef.current.forEach(({ body, penType, playerId }) => {
        const img = penImagesRef.current[penType];
        if (!img) return;

        const { x, y } = body.position;
        const angle = body.angle;

        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        
        // Accurate cropping of the central pen
        const cropLeft = imgW * 0.25;
        const cropWidth = imgW * 0.50;
        const cropTop = imgH * 0.01;
        const cropHeight = imgH * 0.98;

        // We draw it slightly larger than physics body so they look nice
        const drawH = penH * 1.3;
        const drawW = 100;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // TRUE SHADOWS! Since images are transparent PNGs, native shadows work perfectly.
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;

        // Pure source-over drawing (no hacks) for 100% vibrant, visible pens
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(
          img,
          cropLeft, cropTop, cropWidth, cropHeight,
          -drawW / 2, -drawH / 2, drawW, drawH
        );

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Active Player Glow Dot
        if (playerId === activePlayerId) {
          ctx.beginPath();
          ctx.arc(0, -drawH / 2 - 20, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 15;
          ctx.fill();
        }

        ctx.restore();
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, newEngine);
    Matter.Render.run(render);

    const slingshot = new SlingshotMechanic(newEngine);
    slingshotRef.current = slingshot;
    slingshot.setCurrentPlayer(players[0].id);
    slingshot.attach(
      render.canvas,
      (start, end, pw) => { setTrajectory({ start, end }); setPower(pw); },
      () => { turnPendingRef.current = true; setPower(0); setTrajectory({ start: null, end: null }); }
    );

    return () => {
      slingshot.detach(render.canvas);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      render.canvas.remove();
      Matter.Engine.clear(newEngine);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, selectedArena]);

  useEffect(() => {
    if (slingshotRef.current && players.length > 0) {
      const nextId = players[currentTurn]?.id;
      if (nextId) slingshotRef.current.setCurrentPlayer(nextId);
    }
  }, [currentTurn, players]);

  if (players.length === 0) return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white"><a href="/" className="px-8 py-4 bg-amber-500 text-black rounded-xl font-bold">← Go Back</a></div>
  );

  const activeTurnIndex = currentTurn;
  const activePlayer = players[activeTurnIndex];
  const powerColor = power < 40 ? '#10B981' : power < 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ touchAction: 'none' }}>
      <div ref={sceneRef} className="absolute inset-0" style={{ zIndex: 10 }} />

      {winner !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center bg-neutral-900 border border-neutral-700 rounded-3xl p-12 shadow-2xl">
            <div className="text-6xl mb-4">{winner === -1 ? '🤝' : '🏆'}</div>
            <h2 className="text-4xl font-black text-white mb-2">
              {winner === -1 ? 'DRAW!' : `PLAYER ${winner} WINS!`}
            </h2>
            <p className="text-neutral-400 mb-8">{winner === -1 ? 'Both pens were eliminated!' : 'Last pen standing!'}</p>
            <a href="/" className="px-10 py-4 bg-amber-500 text-black rounded-xl font-bold text-lg hover:bg-amber-400 transition-colors">Play Again</a>
          </div>
        </div>
      )}

      {trajectory.start && trajectory.end && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 20 }}>
          <defs><marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={powerColor} /></marker></defs>
          <line x1={trajectory.start.x} y1={trajectory.start.y} x2={trajectory.end.x} y2={trajectory.end.y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="5,5" />
          <line x1={trajectory.start.x} y1={trajectory.start.y} x2={trajectory.start.x * 2 - trajectory.end.x} y2={trajectory.start.y * 2 - trajectory.end.y} stroke={powerColor} strokeWidth="2.5" strokeDasharray="8,6" markerEnd="url(#arrowHead)" opacity="0.9" />
          <circle cx={trajectory.start.x} cy={trajectory.start.y} r="6" fill={powerColor} />
        </svg>
      )}

      {power > 0 && (
        <div className="absolute z-30" style={{ top: '5rem', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="flex flex-col items-center gap-1 bg-black/75 backdrop-blur px-4 py-2 rounded-xl border border-white/10">
            <span className="text-xs text-white/50 tracking-widest font-bold">POWER</span>
            <div className="w-44 h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-75" style={{ width: `${power}%`, backgroundColor: powerColor, boxShadow: `0 0 8px ${powerColor}` }} />
            </div>
            <span className="text-sm font-black" style={{ color: powerColor }}>{power}%</span>
          </div>
        </div>
      )}

      {/* Desktop Top Active Indicator */}
      <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-3 px-5 py-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)', border: `1.5px solid #F59E0B60`, boxShadow: `0 4px 24px #F59E0B30` }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
        <span className="font-bold text-sm tracking-wider" style={{ color: '#F59E0B' }}>PLAYER {activePlayer.id}</span>
        <span className="text-white/40 text-xs">·</span><span className="text-white/60 text-xs capitalize">{activePlayer.penType}</span>
      </div>

      {/* Desktop Bottom Status Bar */}
      <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 gap-2">
        {players.map((p, i) => {
          const isOut = eliminated.includes(p.id);
          const isActive = activeTurnIndex === i && !isOut;
          const pColor = PLAYER_COLORS[i] || '#F59E0B';
          return (
            <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
              style={{ background: isOut ? 'rgba(0,0,0,0.4)' : isActive ? pColor + '35' : 'rgba(0,0,0,0.5)', color: isOut ? '#444' : pColor, border: `1px solid ${isOut ? '#333' : pColor + '50'}`, transform: isActive ? 'scale(1.08)' : 'scale(1)', textDecoration: isOut ? 'line-through' : 'none' }}>
              {isOut ? '💀' : `P${p.id}`} · {p.penType}
            </div>
          );
        })}
      </div>

      {/* Mobile Right Vertical Status Bar (Rotated 90deg for landscape viewing) */}
      <div className="flex md:hidden absolute right-1 top-1/2 -translate-y-1/2 z-30 flex-col gap-8">
        {players.map((p, i) => {
          const isOut = eliminated.includes(p.id);
          const isActive = activeTurnIndex === i && !isOut;
          const pColor = PLAYER_COLORS[i] || '#F59E0B';
          return (
            <div key={p.id} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs font-bold transition-all duration-300 rotate-90"
              style={{ 
                background: isOut ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)', 
                color: isOut ? '#444' : pColor, 
                border: `1.5px solid ${isOut ? '#333' : isActive ? pColor : pColor + '30'}`, 
                boxShadow: isActive ? `0 0 15px ${pColor}60` : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)', 
                textDecoration: isOut ? 'line-through' : 'none' 
              }}>
              <span className="text-sm">{isOut ? '💀' : `P${p.id}`}</span>
              <span className="text-[9px] uppercase tracking-wider">{p.penType.substring(0, 4)}</span>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block absolute top-4 left-4 z-30 text-xs text-white/50 bg-black/50 backdrop-blur px-3 py-2 rounded-lg">Drag back on P{activePlayer.id}'s pen<br /><span className="text-amber-400/80">Tip: Click edge for spin!</span></div>
      
      {/* End Match Button - Rotated 90deg for landscape viewing on Mobile */}
      <div className="absolute top-12 right-2 md:top-4 md:right-4 z-30 flex">
        <a href="/" className="px-4 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs rounded-lg font-medium transition-colors border border-neutral-700 whitespace-nowrap rotate-90 md:rotate-0 translate-x-4 md:translate-x-0">End Match</a>
      </div>
    </div>
  );
}
