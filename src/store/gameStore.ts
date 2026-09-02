import { create } from 'zustand';

export type ArenaType = 'wooden_desk' | 'exam_hall' | 'glass_table' | 'metal_bench';
export type PenType = 'gripper' | 'parker' | 'butterflow' | 'hero' | 'pinpoint' | 'trimax' | 'v7';

export interface PenStats {
  weight: number;
  restitution: number;
  speedMultiplier: number;
  gripMultiplier: number;
}

export const PEN_CONFIGS: Record<PenType, PenStats> = {
  // Gripper: Heavy, High Friction, Medium Speed
  gripper:    { weight: 1.4,  restitution: 0.4, speedMultiplier: 1.1, gripMultiplier: 0.9 },
  // Parker: Super Heavy, Medium Friction, Low Speed
  parker:     { weight: 2.2,  restitution: 0.2, speedMultiplier: 1.1, gripMultiplier: 0.7 },
  // Butterflow: Medium, Low Friction, High Speed
  butterflow: { weight: 1.2,  restitution: 0.5, speedMultiplier: 1.15, gripMultiplier: 0.6 },
  // Hero: Very Heavy, Medium Friction, Medium Speed
  hero:       { weight: 1.8,  restitution: 0.3, speedMultiplier: 1.1, gripMultiplier: 0.8 },
  // Pinpoint: Light, Low Friction, Very High Speed
  pinpoint:   { weight: 1.0,  restitution: 0.6, speedMultiplier: 1.2, gripMultiplier: 0.5 },
  // Trimax: Heavy, Medium Friction, High Speed
  trimax:     { weight: 1.6,  restitution: 0.3, speedMultiplier: 1.15, gripMultiplier: 0.7 },
  // V7: Very Light, Very Low Friction, Extreme Speed
  v7:         { weight: 0.8,  restitution: 0.8, speedMultiplier: 1.3, gripMultiplier: 0.4 },
};

// Table friction applied per-frame as a velocity damping factor
export const ARENA_CONFIGS: Record<ArenaType, { tableFriction: number; kineticFriction: number; restitution: number; color: string; bgImage: string; filter?: string }> = {
  // Classic Desk: High friction, pen stops very quickly (like a real wooden bench)
  wooden_desk: { tableFriction: 0.05, kineticFriction: 1.5, restitution: 0.2, color: '#8B5A2B', bgImage: '/desk.jpg' },
  // Exam Hall: Smooth wood, slides a bit further but still stops
  exam_hall:   { tableFriction: 0.02, kineticFriction: 0.8, restitution: 0.3, color: '#E0E0E0', bgImage: '/exam_hall.jpg' },
  // Glass Table: Low friction, slides far
  glass_table: { tableFriction: 0.005, kineticFriction: 0.3, restitution: 0.6, color: '#ADD8E6', bgImage: '/glass_table.jpg' },
  // Metal Bench: Very high friction, requires hard hits
  metal_bench: { tableFriction: 0.08, kineticFriction: 2.2, restitution: 0.1, color: '#708090', bgImage: '/exam_hall.jpg', filter: 'grayscale(100%) brightness(0.8)' },
};

export interface Player {
  id: number;
  penType: PenType;
  score: number;
  eliminated: boolean;
}

interface GameState {
  playerCount: number;
  players: Player[];
  selectedArena: ArenaType;
  currentTurn: number;
  setPlayerCount: (count: number) => void;
  setPlayerPen: (playerId: number, pen: PenType) => void;
  setSelectedArena: (arena: ArenaType) => void;
  nextTurn: () => void;
  eliminatePlayer: (playerId: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerCount: 2,
  players: [],
  selectedArena: 'wooden_desk',
  currentTurn: 0,
  setPlayerCount: (count) =>
    set({
      playerCount: count,
      players: Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        penType: 'butterflow',
        score: 0,
        eliminated: false,
      })),
    }),
  setPlayerPen: (playerId, pen) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === playerId ? { ...p, penType: pen } : p)),
    })),
  setSelectedArena: (arena) => set({ selectedArena: arena }),
  nextTurn: () =>
    set((state) => {
      const alivePlayers = state.players.filter((p) => !p.eliminated);
      if (alivePlayers.length === 0) return state;
      // Find next alive player after currentTurn
      let next = (state.currentTurn + 1) % state.players.length;
      let tries = 0;
      while (state.players[next]?.eliminated && tries < state.players.length) {
        next = (next + 1) % state.players.length;
        tries++;
      }
      return { currentTurn: next };
    }),
  eliminatePlayer: (playerId) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === playerId ? { ...p, eliminated: true } : p)),
    })),
  resetGame: () =>
    set((state) => ({
      currentTurn: 0,
      players: state.players.map((p) => ({ ...p, score: 0, eliminated: false })),
    })),
}));
