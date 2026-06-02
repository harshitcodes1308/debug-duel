'use client';

import React from 'react';
import KbcComingSoon from '@/components/kbc/KbcComingSoon';

export default function MultiplayerPlaceholder() {
  return (
    <KbcComingSoon 
      title="Play With Friend" 
      description="Create custom matchmaking lobbies, generate unique room codes, and challenge colleagues to settle coding trivia scores in private environments."
      backUrl="/kbc"
    />
  );
}
