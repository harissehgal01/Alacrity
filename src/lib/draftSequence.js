// Captain's Mode sequence. 24 actions: 14 bans, 10 picks.
// 'A' = first-pick team, 'B' = second-pick team.
// Structured after the modern competitive format (second-pick team gets the
// extra opening ban to offset first-pick advantage). Valve nudges the exact
// order patch to patch — edit this array if your group prefers a variant.
export const SEQUENCE = [
  // Ban phase 1 — 7 bans
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  { type: 'ban', team: 'B' },
  // Pick phase 1 — 4 picks (double pick in the middle)
  { type: 'pick', team: 'A' },
  { type: 'pick', team: 'B' },
  { type: 'pick', team: 'B' },
  { type: 'pick', team: 'A' },
  // Ban phase 2 — 3 bans
  { type: 'ban', team: 'A' },
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  // Pick phase 2 — 4 picks
  { type: 'pick', team: 'B' },
  { type: 'pick', team: 'A' },
  { type: 'pick', team: 'B' },
  { type: 'pick', team: 'A' },
  // Ban phase 3 — 4 bans
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  { type: 'ban', team: 'B' },
  { type: 'ban', team: 'A' },
  // Pick phase 3 — final 2 picks
  { type: 'pick', team: 'A' },
  { type: 'pick', team: 'B' },
]

export const TURN_SECONDS = 30      // standard time per action
export const RESERVE_SECONDS = 130  // shared reserve pool per team

export function phaseLabel(step) {
  if (step < 7) return 'Ban phase 1'
  if (step < 11) return 'Pick phase 1'
  if (step < 14) return 'Ban phase 2'
  if (step < 18) return 'Pick phase 2'
  if (step < 22) return 'Ban phase 3'
  return 'Pick phase 3'
}
