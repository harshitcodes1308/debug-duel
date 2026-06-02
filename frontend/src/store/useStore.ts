import { create } from 'zustand';

export interface UserProfile {
  id: string;
  clerkId: string;
  username: string;
  tokens: number;
  eloJS: number;
  eloPython: number;
  eloJava: number;
  totalWins: number;
  totalDuels: number;
  currentStreak: number;
  bestStreak: number;
  rank: string;
  friendKey?: string;
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
