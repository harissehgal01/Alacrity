// Captain's Mode — current sequence (verified against Liquipedia, in force since 7.34):
// Ban Ban Ban Ban Ban Ban Ban · Pick Pick · Ban Ban Ban · Pick Pick Pick Pick Pick Pick · Ban Ban Ban Ban · Pick Pick
// 24 actions: 14 bans, 10 picks.
// 'F' = team with FIRST PICK, 'S' = team with second pick.
// Ban split: first-pick team 3-2-2, second-pick team 4-1-2. Picks: 1-3-1 both.
export const SEQUENCE = [
  // Ban phase 1 · 7 bans (S opens, S gets 4 / F gets 3)
  { type: 'ban', team: 'S' },  //  1
  { type: 'ban', team: 'F' },  //  2
  { type: 'ban', team: 'S' },  //  3
  { type: 'ban', team: 'F' },  //  4
  { type: 'ban', team: 'S' },  //  5
  { type: 'ban', team: 'F' },  //  6
  { type: 'ban', team: 'S' },  //  7
  // Pick phase 1 · 2 picks
  { type: 'pick', team: 'F' }, //  8
  { type: 'pick', team: 'S' }, //  9
  // Ban phase 2 · 3 bans (F bans twice back-to-back, then S)
  { type: 'ban', team: 'F' },  // 10
  { type: 'ban', team: 'F' },  // 11
  { type: 'ban', team: 'S' },  // 12
  // Pick phase 2 · 6 picks (double picks for both)
  { type: 'pick', team: 'S' }, // 13
  { type: 'pick', team: 'F' }, // 14
  { type: 'pick', team: 'F' }, // 15
  { type: 'pick', team: 'S' }, // 16
  { type: 'pick', team: 'S' }, // 17
  { type: 'pick', team: 'F' }, // 18
  // Ban phase 3 · 4 bans
  { type: 'ban', team: 'S' },  // 19
  { type: 'ban', team: 'F' },  // 20
  { type: 'ban', team: 'S' },  // 21
  { type: 'ban', team: 'F' },  // 22
  // Pick phase 3 · final 2 (second-pick team closes with the LAST PICK)
  { type: 'pick', team: 'F' }, // 23
  { type: 'pick', team: 'S' }, // 24
]

export const RESERVE_SECONDS = 130
// Ban phase 1 runs on a 15s clock (7.34 change); everything else 30s.
export function turnSeconds(step) { return step < 7 ? 15 : 30 }

export function phaseLabel(step) {
  if (step < 7) return 'Ban phase 1'
  if (step < 9) return 'Pick phase 1'
  if (step < 12) return 'Ban phase 2'
  if (step < 18) return 'Pick phase 2'
  if (step < 22) return 'Ban phase 3'
  return 'Pick phase 3'
}
