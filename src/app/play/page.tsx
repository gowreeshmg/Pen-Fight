import React from 'react';
import MatterEngine from '@/components/game/MatterEngine';

export default function Play() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      <MatterEngine />
    </main>
  );
}
