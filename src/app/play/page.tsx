import React from 'react';
import MatterEngine from '@/components/game/MatterEngine';

export default function Play() {
  return (
    <main id="landscape-wrapper" className="w-screen h-screen overflow-hidden bg-black">
      <MatterEngine />
    </main>
  );
}
