# DebugDuel Design System (MASTER)
**Theme:** Tactical Dark  
**Visual Mood:** VS Code meets Chess.com Ranked meets Riot Games Esports Client

This document acts as the single source of truth for the visual design language of DebugDuel. All current components and future extensions must strictly comply with these rules.

---

## 1. Global Theme Tokens
These CSS variables define the visual foundation. Define them in `:root` inside [globals.css](file:///Users/harshitsingh/Documents/debug-duel/frontend/src/app/globals.css).

```css
:root {
  /* Background Layers */
  --bg-primary: #0A0C10;   /* Core screen backdrop */
  --bg-secondary: #11141A; /* Inner sidebars, headers */
  --bg-tertiary: #171B22;  /* Tooltips, input fields */

  /* Component Bases */
  --card: #161A21;
  --card-hover: #1D222B;
  --border: #252B35;
  --border-focus: #3B82F6;

  /* Typography Colors */
  --text-primary: #F5F7FA;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;

  /* Accents & Statuses */
  --success: #16C784;     /* Win state / correct compiler submission */
  --danger: #EF4444;      /* Defeat state / compiler error */
  --warning: #F59E0B;     /* Low timer / warning logs */
  --rating: #3B82F6;      /* ELO rating indicators */

  /* Competitive Rank Badges */
  --rank-hunter: #71717A;
  --rank-surgeon: #2563EB;
  --rank-exploit: #7C3AED;
  --rank-god: #D4AF37;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 2. Color Documentation
Accents and colors must feel **earned**. Adhere to the **90% Neutral, 10% Accent** rule.
* **Neutrals (90%)**: Gaps, panels, frames, and code text are rendered in low-contrast variations of slate, grey, and dark charcoal.
* **Accents (10%)**: Glowing green, compiler red, ELO blue, and rank colors are reserved strictly for interactive clicks, action statuses, timers, or ELO counters.
* **Anti-patterns**: Avoid purple-blue SaaS gradients, glowing buttons, or saturated rainbow interfaces. All surfaces should be flat and block-based.

---

## 3. Typography System
Three distinct font families organize reading hierarchy:

| Font Family | Style | Applied To |
|-------------|-------|------------|
| **Space Grotesk** | `Sans-Serif (600, 700)` | Heading tags (`h1`, `h2`, `h3`, headers, logo) |
| **Inter** | `Sans-Serif (400, 500, 600)` | Body text, explanations, instruction paragraphs, form labels |
| **JetBrains Mono** | `Monospace (400, 500, 700)` | Monaco editor content, ELO rating, timers, tokens, streaks |

---

## 4. Spacing System
All margins, padding, and layout positions use a **strict 8px baseline grid**.
* `8px` (Tight elements, tags, badge margins)
* `16px` (Standard inner-component padding, small cards)
* `24px` (Main panel padding, sidebar gaps)
* `32px` (Main page margins, outer-container padding)
* `48px` / `64px` (Section divider spaces)

---

## 5. Border Radius System
Roundness is kept sharp and tactical:
* **Buttons & Badges**: `10px`
* **Inputs & Editor controls**: `8px`
* **Cards & Sidebar frames**: `14px`
* **Modals**: `16px`
* *Forbidden:* Never use fully rounded "pill" shapes (e.g. `border-radius: 9999px`) or extreme borders (>16px).

---

## 6. Shadow System
DebugDuel uses **minimal to zero shadows**. Cards must feel like solid panels integrated directly into the dashboard.
* Prefer borders (`1px solid var(--border)`) over shadows.
* If shadow is used for modals or active states, use sharp, low-spread shadows: `box-shadow: 0 4px 12px rgba(0,0,0,0.5)`.

---

## 7. Component Documentation

### Buttons
All buttons are flat with a distinct border. Hover states transition background colors instantly.
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: var(--transition-fast);
}

.btn-primary {
  background: var(--rating);
  color: var(--text-primary);
  border-color: var(--rating);
}
.btn-primary:hover {
  background: #2563EB;
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
}
.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
```

### Cards
Cards are flat with a solid dark grey background and tactical border:
```css
.card-tactical {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  transition: var(--transition-normal);
}
.card-tactical:hover {
  background: var(--card-hover);
  border-color: var(--border-focus);
}
```

---

## 8. Layout & Arena Specifications
The **Duel Arena** is the core gameplay window and must maximize focus:
* **Layout Distribution**: `70% Monaco Editor` (left panel) and `30% HUD/FOMO Panel` (right panel).
* **Editor Focus**: No extra tabs, margins, or floating panels on the editor frame. Let the code dominate.
* **Timer WARNING states**:
  * Above 60s: Grey/neutral timer text.
  * Below 60s: Orange warning state (`var(--warning)`).
  * Below 30s: Red alert state (`var(--danger)`).
  * Below 10s: Urgent pulsing alert (`1hz` heartbeat loop).

---

## 9. Contributor Design Guide
To ensure visual consistency and block vibe-coding, all contributors must avoid these elements:

| ❌ Forbidden SaaS / AI Vibes | 🟢 Approved Tactical Dark Vibes |
|------------------------------|---------------------------------|
| Purple-blue AI glowing gradients | Flat, high-contrast dark steel backgrounds |
| Floating glassmorphism cards | Border-driven solid boxes |
| Emojis as status icons | SVG icons (Lucide / custom path vectors) |
| Pill-shaped buttons | Sharp, 10px rounded flat buttons |
| Glowing text or gradient text | High contrast clean text with Space Grotesk |

---

## 10. Design QA Checklist
Verify these details before merging code:
- [ ] Typography: Are numbers, ELO, and timers in JetBrains Mono?
- [ ] Spacing: Are all layouts aligned to the 8px grid (8/16/24/32px)?
- [ ] Roundness: Are cards set to `14px`, buttons to `10px`, and modals to `16px`?
- [ ] Contrast: Is the body text at least `var(--text-secondary)` on `var(--bg-primary)` (WCAG compliant)?
- [ ] Hover Feedback: Do interactive elements have `cursor: pointer` and subtle hover transitions?
- [ ] Responsiveness: Does the Arena editor layout remain dominant at 768px, 1024px, and 1440px?
