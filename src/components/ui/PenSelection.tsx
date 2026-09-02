'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, PenType, ArenaType } from '@/store/gameStore';
import { useRouter } from 'next/navigation';

const pens: {
  id: PenType;
  name: string;
  subtitle: string;
  stats: { weight: string; friction: string; speed: string };
  buff: string;
  debuff: string;
  imageSrc: string;
}[] = [
  {
    id: 'butterflow', name: 'Cello Butterflow', subtitle: 'The Standard',
    stats: { weight: 'Medium', friction: 'Low', speed: 'High' },
    buff: 'Glides smoothly on every surface.', debuff: 'No special ability.',
    imageSrc: '/pens/butterflow.png',
  },
  {
    id: 'gripper', name: 'Cello Gripper', subtitle: 'The Defender',
    stats: { weight: 'Heavy', friction: 'High', speed: 'Medium' },
    buff: 'Grip Defense – hard to push off.', debuff: 'Slow to get moving.',
    imageSrc: '/pens/gripper.png',
  },
  {
    id: 'parker', name: 'Parker Vector', subtitle: 'Metal Tank',
    stats: { weight: 'Super Heavy', friction: 'Medium', speed: 'Low' },
    buff: 'Momentum Smash – crushes lighter pens.', debuff: 'Hard to control at full power.',
    imageSrc: '/pens/parker.png',
  },
  {
    id: 'pinpoint', name: 'Cello Pinpoint', subtitle: 'The Assassin',
    stats: { weight: 'Light', friction: 'Low', speed: 'Very High' },
    buff: 'Laser accuracy – perfect straight shots.', debuff: 'Easily knocked away.',
    imageSrc: '/pens/pinpoint.png',
  },
  {
    id: 'trimax', name: 'Reynolds Trimax', subtitle: 'The Brawler',
    stats: { weight: 'Heavy', friction: 'Medium', speed: 'High' },
    buff: 'High damage on collisions.', debuff: 'High risk of sliding off.',
    imageSrc: '/pens/trimax.png',
  },
  {
    id: 'v7', name: 'Pilot V7', subtitle: 'The Sniper',
    stats: { weight: 'Very Light', friction: 'Very Low', speed: 'Extreme' },
    buff: 'Insane speed and distance.', debuff: 'Almost no grip on the table.',
    imageSrc: '/pens/v7.png',
  },
  {
    id: 'hero', name: 'Hero Fountain', subtitle: 'The Boss',
    stats: { weight: 'Very Heavy', friction: 'Medium', speed: 'Medium' },
    buff: 'Tornado Spin – massive spin radius.', debuff: 'Unpredictable trajectory.',
    imageSrc: '/pens/hero.png',
  },
];

const arenas: { id: ArenaType; name: string; desc: string; tint: string; bg: string }[] = [
  { id: 'wooden_desk', name: 'Classic Desk', desc: 'Standard friction. The authentic classroom experience.', tint: '#8B5A2B', bg: '/desk.jpg' },
  { id: 'exam_hall', name: 'Exam Hall', desc: 'Very low friction. Pens slide forever.', tint: '#E0E0E0', bg: '/exam_hall.jpg' },
  { id: 'glass_table', name: 'Glass Table', desc: 'Almost zero friction. Highly chaotic.', tint: '#ADD8E6', bg: '/glass_table.jpg' },
  { id: 'metal_bench', name: 'Metal Bench', desc: 'High friction. Heavy hits required.', tint: '#708090', bg: '/exam_hall.jpg' },
];

const PLAYER_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6'];

function StatBar({ label, value }: { label: string; value: string }) {
  const map: Record<string, number> = { 
    'Very Low': 1, Low: 2, Medium: 3, High: 4, 'Very High': 5, 'Extreme': 5,
    'Very Light': 1, Light: 2, Heavy: 4, 'Very Heavy': 5, 'Super Heavy': 5 
  };
  const bars = map[value] ?? 3;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-400 w-14">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-5 h-1.5 rounded-full"
            style={{ background: i <= bars ? 'currentColor' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span className="text-neutral-300 w-14 text-right">{value}</span>
    </div>
  );
}

export default function PenSelection() {
  const { playerCount, setPlayerCount, players, setPlayerPen, selectedArena, setSelectedArena } = useGameStore();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [phase, setPhase] = useState<'setup' | 'select' | 'arena'>('setup');
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selectedPen, setSelectedPen] = useState<PenType>('butterflow');

  useEffect(() => {
    if (players.length === 0) setPlayerCount(2);
  }, []);

  const currentColor = PLAYER_COLORS[(currentPlayer - 1) % 4];

  const handleStart = () => {
    setPhase('select');
    setCurrentPlayer(1);
    setSelectedPen('butterflow');
    setTimeout(() => scrollRef.current?.scrollTo({ left: 0 }), 50);
  };

  const handleConfirmPen = () => {
    setPlayerPen(currentPlayer, selectedPen);
    if (currentPlayer < playerCount) {
      setCurrentPlayer((p) => p + 1);
      setSelectedPen('butterflow');
      scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      setPhase('arena');
    }
  };

  const handleConfirmArena = () => {
    router.push('/play');
  };

  const scrollBy = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  // ───── SETUP SCREEN ─────
  if (phase === 'setup') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-neutral-950 relative overflow-y-auto py-12">
        <div className="absolute inset-0 bg-cover bg-center opacity-5" style={{ backgroundImage: 'url(/desk.jpg)' }} />
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
          <div className="text-5xl mb-6 select-none">✒️</div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-1">PEN WARS</h1>
          <p className="text-neutral-500 text-sm tracking-widest uppercase mb-10">Desk Fighter · School Edition</p>
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-6">
            <div>
              <p className="text-neutral-400 text-sm mb-4 text-center">Number of players</p>
              <div className="flex gap-3 justify-center">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setPlayerCount(n)}
                    className="w-16 h-16 rounded-xl text-2xl font-black transition-all duration-150"
                    style={{
                      background: playerCount === n ? currentColor : 'transparent',
                      color: playerCount === n ? '#000' : '#666',
                      border: playerCount === n ? 'none' : '2px solid #333',
                      transform: playerCount === n ? 'scale(1.05)' : 'scale(1)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: playerCount }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: PLAYER_COLORS[i] + '15', color: PLAYER_COLORS[i], border: `1px solid ${PLAYER_COLORS[i]}30` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
                  P{i + 1}
                </div>
              ))}
            </div>
            <button onClick={handleStart}
              className="w-full py-4 rounded-xl text-black font-black text-lg tracking-wide transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#F59E0B' }}>
              CHOOSE PENS →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───── ARENA SELECTION SCREEN ─────
  if (phase === 'arena') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-neutral-950 relative overflow-y-auto py-12">
        <div className="absolute inset-0 bg-cover bg-center opacity-5" style={{ backgroundImage: 'url(/desk.jpg)' }} />
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6">
          <h1 className="text-3xl font-black text-white tracking-tight mb-8">Select Battlefield</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
            {arenas.map((arena) => {
              const isSelected = selectedArena === arena.id;
              return (
                <div key={arena.id} onClick={() => setSelectedArena(arena.id)}
                  className="relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 border-2"
                  style={{ 
                    borderColor: isSelected ? '#F59E0B' : '#222',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  {/* Background texture tinted */}
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${arena.bg})` }} />
                  <div className="absolute inset-0" style={{ backgroundColor: arena.tint, opacity: 0.6, mixBlendMode: 'color' }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
                  
                  <div className="relative z-10 p-6 pt-24">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-2xl font-black text-white">{arena.name}</h3>
                      {isSelected && <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-xs">✓</div>}
                    </div>
                    <p className="text-neutral-300 text-sm">{arena.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleConfirmArena}
            className="px-12 py-4 rounded-xl text-black font-black text-xl tracking-wide transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#F59E0B' }}>
            START BATTLE ⚔️
          </button>
        </div>
      </div>
    );
  }

  // ───── PEN SELECTION SCREEN ─────
  const selectedPenData = pens.find((p) => p.id === selectedPen)!;

  return (
    <div className="h-[100dvh] flex flex-col bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-5" style={{ backgroundImage: 'url(/desk.jpg)' }} />

      <div className="relative z-10 flex-shrink-0 pt-6 pb-3 px-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: i + 1 === currentPlayer ? PLAYER_COLORS[i] + '25' : 'transparent',
                color: i + 1 < currentPlayer ? '#333' : PLAYER_COLORS[i],
                border: `1px solid ${i + 1 === currentPlayer ? PLAYER_COLORS[i] + '60' : '#222'}`,
                textDecoration: i + 1 < currentPlayer ? 'line-through' : 'none',
              }}>
              P{i + 1}
            </div>
          ))}
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Player {currentPlayer} <span style={{ color: currentColor }}>— Choose Weapon</span>
        </h1>
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center py-2">
        <button onClick={() => scrollBy('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 text-white text-lg flex items-center justify-center hover:bg-neutral-700">‹</button>
        <button onClick={() => scrollBy('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 text-white text-lg flex items-center justify-center hover:bg-neutral-700">›</button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-12 pb-2" style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
          {pens.map((pen) => {
            const isSelected = selectedPen === pen.id;
            return (
              <div key={pen.id} onClick={() => setSelectedPen(pen.id)}
                className="flex-shrink-0 cursor-pointer transition-all duration-200 flex flex-col"
                style={{ width: '240px', scrollSnapAlign: 'center', transform: isSelected ? 'translateY(-4px) scale(1.02)' : 'scale(1)' }}>
                <div className="flex flex-col h-full rounded-xl overflow-hidden"
                  style={{ background: isSelected ? '#1a1a1a' : '#111', border: `1.5px solid ${isSelected ? currentColor : '#222'}`, boxShadow: isSelected ? `0 8px 30px ${currentColor}25` : 'none' }}>
                  <div className="h-40 flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ede8d0, #d4c89a)' }}>
                    <img src={pen.imageSrc} alt={pen.name} className="h-36 object-contain" style={{ mixBlendMode: 'multiply', filter: 'contrast(1.05)' }} />
                    {isSelected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-black text-xs font-black" style={{ background: currentColor }}>✓</div>}
                  </div>
                  <div className="p-4 flex flex-col gap-2.5 flex-1">
                    <div>
                      <h3 className="text-white font-bold text-sm leading-tight">{pen.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: currentColor }}>{pen.subtitle}</p>
                    </div>
                    <div className="flex flex-col gap-1.5" style={{ color: currentColor }}>
                      <StatBar label="Weight" value={pen.stats.weight} />
                      <StatBar label="Friction" value={pen.stats.friction} />
                      <StatBar label="Speed" value={pen.stats.speed} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex-shrink-0 px-6 pb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ede8d0, #d4c89a)' }}>
            <img src={selectedPenData.imageSrc} alt={selectedPenData.name} className="h-12 object-contain" style={{ mixBlendMode: 'multiply' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{selectedPenData.name}</p>
            <p className="text-neutral-500 text-xs">{selectedPenData.subtitle}</p>
          </div>
          <button onClick={handleConfirmPen}
            className="flex-shrink-0 px-6 py-3 rounded-xl font-black text-sm text-black transition-all hover:opacity-90 active:scale-95"
            style={{ background: currentColor }}>
            {currentPlayer < playerCount ? 'NEXT PLAYER →' : 'NEXT: ARENA →'}
          </button>
        </div>
      </div>
    </div>
  );
}
