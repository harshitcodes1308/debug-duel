'use client';

import React from 'react';
import KbcComingSoon from '@/components/kbc/KbcComingSoon';

export default function SoloChallengePlaceholder() {
  return (
    <KbcComingSoon 
      title="Solo Challenge Gameplay" 
      description="Prepare yourself for the ultimate 15-question coding ladder challenge. Correct responses will double your potential coins at each milestone. Choose lifelines wisely when stuck."
      backUrl="/kbc/categories"
    />
  );
}
