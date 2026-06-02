'use client';

import React from 'react';
import KbcComingSoon from '@/components/kbc/KbcComingSoon';

export default function DailyChallengePlaceholder() {
  return (
    <KbcComingSoon 
      title="Daily Challenge" 
      description="Come back every day for a single high-difficulty, high-reward puzzle curated specifically to test deep technical domains. Double tokens on success."
      backUrl="/kbc"
    />
  );
}
