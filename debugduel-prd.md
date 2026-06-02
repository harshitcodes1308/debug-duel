# DebugDuel — Product Requirements Document
**Version:** 1.0 — MVP  
**Author:** Harshit Singh  
**Status:** Ready for IDE ingestion  
**Target Build Time:** 4–5 days  

---

## 1. Product Vision

DebugDuel is a real-time 1v1 debugging battle game. Two developers enter a shared broken codebase — first to find the bug, fix it, and explain it wins. It is the first developer minigame platform. DebugDuel is the first minigame. More follow (Design Battle, Marketing War, etc.).

**North Star Metric:** Daily active duels per user  
**Core Loop:** Enter lobby → Match with friend/random → Receive broken code → Race to fix → Win tokens → Climb ELO → Flex on leaderboard

---

## 2. Core Concepts

### 2.1 The Duel
- Two players. Same bugged codebase. Timer: **3 minutes max** per round.
- Players cannot see each other's editor — only FOMO signals (see section 5.3).
- First to submit a correct fix + explanation wins.
- Every duel has a **token bet** placed upfront. Winner takes the pot.

### 2.2 Token Economy
| Action | Tokens |
|--------|--------|
| Win a duel | +50 + opponent bet |
| Lose a duel | Lose your bet |
| Daily login | +10 |
| First win of the day | +25 bonus |
| Correct explanation quality (AI judged) | +0 to +20 bonus |
| Winning streak (3+) | +15 per additional win |

**Token utility:**
- Place bets on duels
- Unlock premium bug packs (rare languages, advanced difficulty)
- Buy avatar cosmetics and editor themes
- Entry fee for tournament brackets (future)

### 2.3 ELO System
- Starting ELO: **1000**
- ELO changes based on opponent rating delta
- Rank tiers: **Bug Hunter → Code Surgeon → Exploit Master → Zero-Day God**
- Each tier has a badge displayed on profile and in duel lobby
- ELO is language-specific (your Python ELO can differ from your JS ELO)

---

## 3. Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Editor:** Monaco Editor (same engine as VSCode) — `@monaco-editor/react`
- **Real-time:** Socket.io client
- **Styling:** Inline CSS only, no Tailwind (consistent with Saviours AI pattern)
- **Auth:** Clerk
- **State:** Zustand

### Backend
- **Runtime:** Node.js with Express
- **WebSocket:** Socket.io server
- **Database:** Neon PostgreSQL + Prisma ORM
- **AI (Bug generation + explanation judging):** OpenAI `gpt-4o-mini` via Anthropic API or OpenAI SDK
- **Hosting:** Vercel (frontend) + Railway or Render (backend WebSocket server)

### Database Schema (Prisma)
```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  username      String   @unique
  tokens        Int      @default(500)
  eloJS         Int      @default(1000)
  eloPython     Int      @default(1000)
  eloJava       Int      @default(1000)
  totalWins     Int      @default(0)
  totalDuels    Int      @default(0)
  currentStreak Int      @default(0)
  bestStreak    Int      @default(0)
  rank          String   @default("Bug Hunter")
  createdAt     DateTime @default(now())
  duels         DuelParticipant[]
}

model Bug {
  id          String   @id @default(cuid())
  language    String   // "javascript" | "python" | "java"
  difficulty  String   // "easy" | "medium" | "hard"
  title       String
  brokenCode  String
  fixedCode   String
  explanation String
  category    String   // "logic" | "syntax" | "runtime" | "off-by-one" | "null-ref" | "async"
  createdAt   DateTime @default(now())
  duels       Duel[]
}

model Duel {
  id           String   @id @default(cuid())
  bugId        String
  bug          Bug      @relation(fields: [bugId], references: [id])
  status       String   @default("waiting") // "waiting" | "active" | "completed"
  betAmount    Int      @default(50)
  winnerId     String?
  language     String
  difficulty   String
  startedAt    DateTime?
  endedAt      DateTime?
  createdAt    DateTime @default(now())
  participants DuelParticipant[]
}

model DuelParticipant {
  id              String   @id @default(cuid())
  duelId          String
  duel            Duel     @relation(fields: [duelId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  submittedCode   String?
  explanation     String?
  submitTime      Int?     // seconds from duel start
  explanationScore Int?    // 0-20, AI judged
  isWinner        Boolean  @default(false)
  progressPercent Int      @default(0) // for FOMO signals
}
```

---

## 4. Feature Spec — MVP

### 4.1 Authentication & Onboarding
- Clerk-powered auth (Google + GitHub)
- On first login: pick username, choose primary language, tutorial duel vs AI bot
- Welcome bonus: **500 tokens** on signup

### 4.2 Home Dashboard
**Sections:**
1. **Player Card** — username, rank badge, ELO, tokens, win/loss, streak flame
2. **Quick Duel** — "Challenge a friend" (share link) + "Find random opponent" (coming soon badge)
3. **Leaderboard strip** — Top 5 players by ELO for selected language
4. **Daily Challenge** — Free bug, no bet, no ELO change. Just practice. Resets 00:00 IST.
5. **Recent Battles** — last 5 duel results with replay button

### 4.3 Duel Creation Flow
```
Step 1: Select language (JS / Python / Java)
Step 2: Select difficulty (Easy 🟢 / Medium 🟡 / Hard 🔴)
Step 3: Set bet (min 25 tokens, max = your balance)
Step 4: Get shareable duel link → share with friend
Step 5: Wait in lobby → opponent joins → countdown 3-2-1 → duel starts
```

Both players must have enough tokens to cover the bet. If not, they see a "not enough tokens" state with a "grind daily challenges" CTA.

### 4.4 The Duel Arena (Core Screen)
This is the most important screen. Layout:

```
┌─────────────────────────────────────────────────────────┐
│  TIMER: 2:47        DEBUGDUEL         🔥 YOU vs @enemy   │
├─────────────────────────────────────────────────────────┤
│  Bug Title: "Off-by-one in array traversal" [MEDIUM]    │
├───────────────────────────────────┬─────────────────────┤
│                                   │   FOMO PANEL        │
│   MONACO EDITOR                   │   ─────────────     │
│   (full editor, syntax highlight) │   @enemy is...      │
│   (player's code only)            │   "typing fast 🔥"  │
│                                   │   Progress: ██░░ 52%│
│                                   │                     │
│                                   │   [FOMO messages    │
│                                   │    rotate every 8s] │
├───────────────────────────────────┴─────────────────────┤
│  [SUBMIT FIX]           Hint (-15 tokens) | Forfeit      │
└─────────────────────────────────────────────────────────┘
```

**Editor config:**
- Monaco with language-appropriate syntax highlighting
- No autocomplete (it's a challenge)
- Line numbers on
- Font: JetBrains Mono or Fira Code
- No AI-assist, no IntelliSense suggestions

**Submit flow:**
1. Player clicks SUBMIT FIX
2. Code is run through AI judge (gpt-4o-mini) against the expected fix
3. AI checks: is the bug fixed? (pass/fail)
4. If pass: player is prompted for a 1-2 sentence explanation of what was wrong
5. Explanation is AI-scored (0–20 points, affects token bonus)
6. Server broadcasts winner to both clients

### 4.5 FOMO Signals System
Player B receives real-time signals about Player A's activity. These are **fabricated/gamified signals**, not actual code state.

**Signal types (rotate every 6–10 seconds):**
```javascript
const fomoMessages = [
  "{opponent} is typing fast 🔥",
  "{opponent} just deleted 3 lines",
  "{opponent} ran the code",
  "{opponent} is 60% done",
  "{opponent} found something...",
  "{opponent} hesitated",
  "{opponent} rewrote everything",
  "They're close. Can you feel it?",
  "{opponent} slowed down 👀",
  "The gap is closing...",
]
```

Progress bar is a **fake progress indicator** — it moves pseudo-randomly to simulate opponent progress. This is purely psychological. Real winner is determined only by correct submission.

Implementation: Socket event `fomo_update` emitted every 7 seconds from server, cycling through messages + random progress delta.

### 4.6 Result Screen
After duel ends:

**Winner gets:**
- Big W animation (confetti, rank glow)
- Token gain breakdown: base + bet + explanation bonus + streak bonus
- ELO change (+X)
- Streak counter update

**Loser gets:**
- Token deduction
- ELO change (-X)
- "Rematch?" button (creates new duel with same config)
- "See their solution" button (reveals winner's code + explanation)
- Motivational message based on time difference ("you were only 18 seconds behind!")

**Both players get:**
- Side-by-side replay: timestamps of each edit event (just visual, no actual keystrokes)
- Shareable result card (screenshot-able, shows: winner, language, difficulty, time taken)

### 4.7 Bug Submission (Judging)
The AI judge receives:
```
System: You are a code judge. Compare the submitted fix to the expected fix. 
Return JSON: { "passed": true/false, "reason": "brief reason" }

User: 
Language: JavaScript
Broken code: [broken code]
Expected fix: [correct code] 
Submitted fix: [player submission]
```

Explanation judge:
```
System: Score this debugging explanation 0-20. 
20 = perfectly explains root cause + why it breaks + how fix works.
0 = wrong or missing.
Return JSON: { "score": number, "feedback": "1 sentence" }

User:
Bug: [bug description]
Player explanation: [their explanation]
```

### 4.8 Bug Library (AI-Generated)
Bugs are pre-generated and stored in DB. Generate at least **50 bugs per language per difficulty** before launch.

**Generation prompt template:**
```
Generate a debugging challenge for {language} at {difficulty} difficulty.

Rules:
- The bug must be subtle but findable in 3 minutes
- The bug must be in 15-40 lines of code
- The surrounding code must look plausible and functional
- Bug categories: logic error, off-by-one, null reference, async/timing, type coercion, scope issue
- Do NOT make the bug obvious (no syntax errors for medium/hard)

Return JSON:
{
  "title": "short descriptive title",
  "brokenCode": "full code with bug",
  "fixedCode": "full corrected code", 
  "explanation": "what the bug is and why",
  "category": "logic|syntax|runtime|off-by-one|null-ref|async",
  "difficulty": "easy|medium|hard"
}
```

**Bug quality rules:**
- Easy: single obvious bug, 15–20 lines, beginner concepts
- Medium: subtle bug, 25–35 lines, intermediate patterns
- Hard: obscure edge case, 35–45 lines, advanced language feature

---

## 5. Real-Time Architecture (Socket.io)

### 5.1 Events: Client → Server
```javascript
socket.emit('join_duel', { duelId, userId })
socket.emit('submit_fix', { duelId, userId, code, explanation })
socket.emit('forfeit', { duelId, userId })
socket.emit('progress_update', { duelId, userId, percent }) // optional, for real progress
```

### 5.2 Events: Server → Client
```javascript
socket.emit('duel_started', { bug, startTime, opponentUsername })
socket.emit('fomo_update', { message, opponentProgress })
socket.emit('opponent_submitted', {}) // triggers "your opponent just submitted!" alert
socket.emit('duel_result', { winnerId, winnerCode, explanation, eloChanges, tokenChanges })
socket.emit('opponent_forfeited', {}) // auto-win
```

### 5.3 Room Management
Each duel gets a Socket.io room: `duel:{duelId}`  
Both participants join this room on duel start.  
Server manages the FOMO emission loop per active room.

---

## 6. Gamification Layer

### 6.1 Rank Progression
| Rank | ELO Range | Badge Color |
|------|-----------|-------------|
| Bug Hunter | 0–1199 | Gray |
| Code Surgeon | 1200–1499 | Blue |
| Exploit Master | 1500–1799 | Purple |
| Zero-Day God | 1800+ | Gold |

Rank-up triggers a full-screen animation + confetti + toast notification.

### 6.2 Achievement System (post-MVP, define now)
| Achievement | Trigger | Token Reward |
|------------|---------|-------------|
| First Blood | Win first duel | +100 |
| Hat Trick | 3 wins in a row | +150 |
| Speed Demon | Win in under 60s | +200 |
| Explanator | Score 20/20 on explanation | +75 |
| Polyglot | Win in all 3 languages | +300 |
| Comeback King | Win after losing 3 | +100 |
| Daily Grinder | 7 day login streak | +250 |

### 6.3 Daily Quests (post-MVP, define now)
- Win 2 duels today → +50 tokens
- Submit an explanation → +20 tokens
- Try a new language → +30 tokens

### 6.4 Streak System
- Win streak tracked in real-time
- Visual flame counter (🔥 x3, 🔥🔥 x5, etc.) on profile card
- Streak broken on any loss (not forfeits)

---

## 7. Screens & Routes

| Route | Screen |
|-------|--------|
| `/` | Landing / Auth |
| `/dashboard` | Home Dashboard |
| `/duel/create` | Duel Creation Flow |
| `/duel/lobby/:id` | Waiting Lobby |
| `/duel/:id` | Live Duel Arena |
| `/duel/:id/result` | Result Screen |
| `/profile/:username` | Player Profile |
| `/leaderboard` | Full Leaderboard |
| `/practice` | Daily Challenge (solo) |

---

## 8. Design System

### Colors
```css
--bg-primary: #0D0D12;
--bg-secondary: #141419;
--bg-card: #1A1A22;
--accent-green: #00FF94;    /* win state */
--accent-red: #FF4444;      /* loss state */
--accent-amber: #F5A623;    /* warning / timer low */
--accent-blue: #4A9EFF;     /* info / ELO */
--accent-purple: #8B5CF6;   /* rank badges */
--text-primary: #F0F0F0;
--text-secondary: #8888A0;
--border: rgba(255,255,255,0.08);
```

### Typography
- **Display/Headings:** `Syne` or `Space Grotesk` (bold, impact)
- **Editor/Code:** `JetBrains Mono`
- **Body/UI:** `Inter`

### Tone
Dark terminal aesthetic. Competitive. Fast. Not a LeetCode clone — this is a battle arena.

---

## 9. API Routes

```
POST /api/duel/create         → create duel, returns duelId + share link
POST /api/duel/:id/join       → opponent joins, transitions to active
POST /api/duel/:id/submit     → submit code, triggers AI judge
GET  /api/duel/:id            → get duel state
GET  /api/bugs/random         → get random bug (language + difficulty query params)
GET  /api/leaderboard         → top 50 by ELO
GET  /api/profile/:username   → user stats
POST /api/user/dailylogin     → claim daily tokens
```

---

## 10. MVP Scope (Day-by-Day Plan)

### Day 1 — Foundation
- [ ] Next.js + Clerk auth setup
- [ ] Prisma schema + Neon DB connected
- [ ] User creation on signup, token grant
- [ ] Basic dashboard layout

### Day 2 — Bug System
- [ ] Bug model + seed 30 bugs (10 JS easy/medium/hard each via GPT)
- [ ] `/practice` route — solo bug viewer with Monaco editor
- [ ] AI judge endpoint working (submit code → pass/fail)

### Day 3 — Duel Core
- [ ] Socket.io server running
- [ ] Duel creation + lobby
- [ ] Both players connected to room
- [ ] Live duel arena screen (editor + timer + FOMO panel)

### Day 4 — Real-Time + Results
- [ ] FOMO signal loop working
- [ ] Submit → judge → broadcast winner
- [ ] Result screen with token/ELO updates
- [ ] Rematch flow

### Day 5 — Polish + Deploy
- [ ] Leaderboard
- [ ] Profile page
- [ ] Streak + rank badges
- [ ] Deploy (Vercel + Railway)
- [ ] Bug fixes + mobile responsiveness

---

## 11. Post-MVP Roadmap

### v1.1 — Online Matchmaking
- ELO-based matchmaking queue
- "Find random opponent" fully functional
- Queue timer + estimated wait time

### v1.2 — Tournaments
- 8/16 player bracket tournaments
- Token entry fee → winner takes pool
- Bracket visualization

### v1.3 — More Minigames (The Platform Expands)
**DesignDuel** — Two designers, one Figma brief, 10 minutes. Community votes winner.  
**MarketingBattle** — Write a headline/ad copy for a product. AI judges on persuasiveness + clarity.  
**QueryWar** — SQL query optimization duel. Faster query on same dataset wins.  
**PitchArena** — 60-second pitch battle. AI judges on structure + clarity.

### v1.4 — Spectator Mode
- Watch live duels (read-only)
- Bet tokens on who you think will win
- Replays publicly shareable

### v1.5 — Team Duels
- 2v2 format
- Each player on a team handles a different bug in the same codebase
- Collaborative fix required

---

## 12. Non-Functional Requirements

- **Latency:** Socket events must feel near-instant (< 100ms in same region)
- **Judge speed:** AI judge response < 5 seconds (use streaming if needed)
- **Uptime:** 99%+ during active duels (Railway always-on dyno)
- **Security:** Never expose bug solution in client-side payload before duel ends
- **Fair play:** Bug is fetched from server only on duel start, never before
- **Token integrity:** All token transactions are server-side only. Client just shows state.

---

## 13. Environment Variables Needed

```env
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
OPENAI_API_KEY=
SOCKET_SERVER_URL=
NEXT_PUBLIC_SOCKET_SERVER_URL=
```

---

*DebugDuel is minigame #1. Build the platform right the first time.*
