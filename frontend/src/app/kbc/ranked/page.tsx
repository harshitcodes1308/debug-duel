'use client';

import React from 'react';
import KbcComingSoon from '@/components/kbc/KbcComingSoon';

export default function RankedArenaPlaceholder() {
  return (
    <KbcComingSoon 
      title="Ranked Arena" 
      description="Compete in real-time matchmaking duels. Answer questions faster than your opponent to earn ranking points, climbing the competitive leaderboards."
      backUrl="/kbc"
    />
  );
}
