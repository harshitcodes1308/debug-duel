import { create } from 'zustand';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  category: 'Combat' | 'Streak' | 'Progression' | 'KBC' | 'Consistency' | 'Social' | 'Special';
  xpReward: number;
  tokenReward: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement: Achievement;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  rewardXP: number;
  rewardTokens: number;
  category: 'DAILY' | 'WEEKLY';
}

export interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  completedAt?: string;
  expiresAt: string;
  quest: Quest;
}

export interface UserProfile {
  id: string;
  clerkId: string;
  username: string;
  tokens: number;
  eloDebugDuel: number;
  eloUIUX: number;
  eloKbc: number;
  rankedElo?: number;
  totalWins: number;
  totalDuels: number;
  currentStreak: number;
  bestStreak: number;
  rank: string;
  currentRank?: string;
  rankPoints?: number;
  xp?: number;
  level?: number;
  friendKey?: string;
  achievements?: UserAchievement[];
  dailyQuestsCompleted?: number;
  weeklyQuestsCompleted?: number;
  lifetimeQuestsCompleted?: number;
  dailyStreak?: number;
}

export interface Bug {
  id: string;
  language: string;
  difficulty: string;
  title: string;
  brokenCode: string;
  category: string;
}

export interface Participant {
  id: string;
  duelId: string;
  userId: string;
  user: UserProfile;
  submittedCode?: string;
  explanation?: string;
  isWinner: boolean;
}

export interface DuelState {
  id: string;
  bugId: string;
  bug?: Bug;
  status: 'waiting' | 'active' | 'completed';
  betAmount: number;
  winnerId?: string;
  language: string;
  difficulty: string;
  participants: Participant[];
}

interface StoreState {
  user: UserProfile | null;
  currentDuel: DuelState | null;
  secondsLeft: number;
  fomoMessage: string;
  opponentProgress: number;
  opponentSubmitted: boolean;

  setUser: (user: UserProfile | null) => void;
  setCurrentDuel: (duel: DuelState | null) => void;
  setSecondsLeft: (seconds: number) => void;
  tickTimer: () => void;
  setFomo: (message: string, progress: number) => void;
  setOpponentSubmitted: (submitted: boolean) => void;
  resetDuelState: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  currentDuel: null,
  secondsLeft: 180, // 3 minutes max
  fomoMessage: "Waiting for opponent actions...",
  opponentProgress: 0,
  opponentSubmitted: false,

  setUser: (user) => set({ user }),
  setCurrentDuel: (currentDuel) => set({ currentDuel }),
  setSecondsLeft: (secondsLeft) => set({ secondsLeft }),
  tickTimer: () => {
    const current = get().secondsLeft;
    if (current > 0 && get().currentDuel?.status === 'active') {
      set({ secondsLeft: current - 1 });
    }
  },
  setFomo: (fomoMessage, opponentProgress) => set({ fomoMessage, opponentProgress }),
  setOpponentSubmitted: (opponentSubmitted) => set({ opponentSubmitted }),
  resetDuelState: () => set({
    currentDuel: null,
    secondsLeft: 180,
    fomoMessage: "Waiting for opponent actions...",
    opponentProgress: 0,
    opponentSubmitted: false
  })
}));
