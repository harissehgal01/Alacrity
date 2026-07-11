// Captain's Mode — Alacrity house sequence (as specified by the group, not the
// generic patch order). 24 actions: 14 bans, 10 picks, 7/7 bans and 5/5 picks.
// 'F' = the team that bans first (decided by the toss). 'S' = the other team.
export const SEQUENCE = [
  { type: 'ban', team: 'F' },  //  1
  { type: 'ban', team: 'F' },  //  2
  { type: 'ban', team: 'S' },  //  3
  { type: 'ban', team: 'S' },  //  4
  { type: 'ban', team: 'F' },  //  5
  { type: 'ban', team: 'S' },  //  6
  { type: 'ban', team: 'S' },  //  7
  { type: 'pick', team: 'F' }, //  8
  { type: 'pick', team: 'S' }, //  9
  { type: 'ban', team: 'F' },  // 10
  { type: 'ban', team: 'F' },  // 11
  { type: 'ban', team: 'S' },  // 12
  { type: 'pick', team: 'S' }, // 13
  { type: 'pick', team: 'F' }, // 14
  { type: 'pick', team: 'F' }, // 15
  { type: 'pick', team: 'S' }, // 16
  { type: 'pick', team: 'S' }, // 17
  { type: 'pick', team: 'F' }, // 18
  { type: 'ban', team: 'F' },  // 19
  { type: 'ban', team: 'S' },  // 20
  { type: 'ban', team: 'F' },  // 21
  { type: 'ban', team: 'S' },  // 22
  { type: 'pick', team: 'F' }, // 23
  { type: 'pick', team: 'S' }, // 24
]

export const RESERVE_SECONDS = 130
export function turnSeconds(step) { return step < 7 ? 15 : 30 }

export function phaseLabel(step) {
  if (step < 7) return 'Ban phase 1'
  if (step < 9) return 'Pick phase 1'
  if (step < 13) return 'Ban phase 2'
  if (step < 18) return 'Pick phase 2'
  if (step < 22) return 'Ban phase 3'
  return 'Pick phase 3'
}
