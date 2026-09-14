import { AWARD_TYPES } from "./awards";

let idCounter = 0;
export function nextAwardId() {
  idCounter += 1;
  return `award-${Date.now()}-${idCounter}`;
}

export const DEFAULT_AWARDS = [
  { id: nextAwardId(), name: "Early Five", type: AWARD_TYPES.EARLY_FIVE, maxWinners: 1, points: 10 },
  { id: nextAwardId(), name: "First Line", type: AWARD_TYPES.LINE_1, maxWinners: 1, points: 10 },
  { id: nextAwardId(), name: "Second Line", type: AWARD_TYPES.LINE_2, maxWinners: 1, points: 10 },
  { id: nextAwardId(), name: "Third Line", type: AWARD_TYPES.LINE_3, maxWinners: 1, points: 10 },
  { id: nextAwardId(), name: "Big Corner", type: AWARD_TYPES.BIG_CORNER, maxWinners: 1, points: 15 },
  { id: nextAwardId(), name: "Full House", type: AWARD_TYPES.FULL_HOUSE, maxWinners: 1, points: 50 },
];

// Fallback for awards persisted before `type` existed (old rooms/presets) —
// matched by the standard display name so those don't silently become
// "custom, manual-only" forever. Anything else genuinely is custom.
const NAME_TO_TYPE = {
  "early five": AWARD_TYPES.EARLY_FIVE,
  "first line": AWARD_TYPES.LINE_1,
  "second line": AWARD_TYPES.LINE_2,
  "third line": AWARD_TYPES.LINE_3,
  "big corner": AWARD_TYPES.BIG_CORNER,
  "full house": AWARD_TYPES.FULL_HOUSE,
};

export function resolveAwardType(award) {
  if (award.type) return award.type;
  return NAME_TO_TYPE[award.name?.trim().toLowerCase()] || "custom";
}
