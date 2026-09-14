import { ticketNumbers } from "./ticket";

// Award "types" are stable identifiers independent of a host renaming the
// award — HostCreatePage tags the 6 standard awards with these types so
// auto-verify keeps working even if e.g. "Full House" gets renamed to
// "Jackpot". Custom awards a host adds have type "custom" and are not
// auto-verified (the host awards those manually in Story 7).
export const AWARD_TYPES = {
  EARLY_FIVE: "earlyFive",
  LINE_1: "line1",
  LINE_2: "line2",
  LINE_3: "line3",
  BIG_CORNER: "bigCorner",
  FULL_HOUSE: "fullHouse",
};

export function cornerNumbers(grid) {
  const firstRowNums = grid[0].filter((n) => n !== 0);
  const lastRowNums = grid[2].filter((n) => n !== 0);
  if (firstRowNums.length === 0 || lastRowNums.length === 0) return [];
  return [
    firstRowNums[0],
    firstRowNums[firstRowNums.length - 1],
    lastRowNums[0],
    lastRowNums[lastRowNums.length - 1],
  ];
}

export function checkEarlyFive(grid, calledSet) {
  const nums = ticketNumbers(grid);
  const calledCount = nums.filter((n) => calledSet.has(n)).length;
  return calledCount >= 5;
}

export function checkLine(grid, rowIndex, calledSet) {
  const rowNums = grid[rowIndex].filter((n) => n !== 0);
  return rowNums.length > 0 && rowNums.every((n) => calledSet.has(n));
}

export function checkFullHouse(grid, calledSet) {
  const nums = ticketNumbers(grid);
  return nums.every((n) => calledSet.has(n));
}

export function checkBigCorner(grid, calledSet) {
  const corners = cornerNumbers(grid);
  return corners.length === 4 && corners.every((n) => calledSet.has(n));
}

// Returns the array of award TYPES (see AWARD_TYPES) this ticket currently
// qualifies for, given the grid and the numbers called so far.
export function checkAllAwards(grid, calledNumbers) {
  const calledSet =
    calledNumbers instanceof Set ? calledNumbers : new Set(calledNumbers);
  const won = [];

  if (checkEarlyFive(grid, calledSet)) won.push(AWARD_TYPES.EARLY_FIVE);
  if (checkLine(grid, 0, calledSet)) won.push(AWARD_TYPES.LINE_1);
  if (checkLine(grid, 1, calledSet)) won.push(AWARD_TYPES.LINE_2);
  if (checkLine(grid, 2, calledSet)) won.push(AWARD_TYPES.LINE_3);
  if (checkBigCorner(grid, calledSet)) won.push(AWARD_TYPES.BIG_CORNER);
  if (checkFullHouse(grid, calledSet)) won.push(AWARD_TYPES.FULL_HOUSE);

  return won;
}

// Returns the specific numbers that make up an award's pattern, for
// highlighting on a ticket (e.g. a winner-review screen). Line/corner/full
// house awards have a fixed set of cells; Early Five doesn't (any 5 called
// numbers qualify), so as an approximation we highlight whichever of the
// ticket's numbers are actually called, same as Full House.
export function awardPatternNumbers(grid, type, calledSet) {
  switch (type) {
    case AWARD_TYPES.LINE_1:
      return grid[0].filter((n) => n !== 0);
    case AWARD_TYPES.LINE_2:
      return grid[1].filter((n) => n !== 0);
    case AWARD_TYPES.LINE_3:
      return grid[2].filter((n) => n !== 0);
    case AWARD_TYPES.BIG_CORNER:
      return cornerNumbers(grid);
    case AWARD_TYPES.FULL_HOUSE:
      return ticketNumbers(grid);
    case AWARD_TYPES.EARLY_FIVE:
      return ticketNumbers(grid).filter((n) => calledSet?.has(n));
    default:
      return [];
  }
}

// How close this ticket is to winning its NEXT (not-yet-won) standard
// award, as a 0-1 fraction — used to rank a live "tickets in play" board so
// the host can see who's closing in. Ignores award types already in
// alreadyWonTypes so a ticket that already completed Early Five doesn't
// look "100% close" to something it's already won.
export function ticketProgressFraction(grid, calledSet, alreadyWonTypes = []) {
  const numbers = ticketNumbers(grid);
  const calledCount = numbers.filter((n) => calledSet.has(n)).length;

  const candidates = [
    { type: AWARD_TYPES.EARLY_FIVE, frac: Math.min(1, calledCount / 5) },
    {
      type: AWARD_TYPES.LINE_1,
      frac: grid[0].filter((n) => n !== 0 && calledSet.has(n)).length / 5,
    },
    {
      type: AWARD_TYPES.LINE_2,
      frac: grid[1].filter((n) => n !== 0 && calledSet.has(n)).length / 5,
    },
    {
      type: AWARD_TYPES.LINE_3,
      frac: grid[2].filter((n) => n !== 0 && calledSet.has(n)).length / 5,
    },
    {
      type: AWARD_TYPES.BIG_CORNER,
      frac: cornerNumbers(grid).filter((n) => calledSet.has(n)).length / 4,
    },
    { type: AWARD_TYPES.FULL_HOUSE, frac: calledCount / 15 },
  ];

  const remaining = candidates.filter((c) => !alreadyWonTypes.includes(c.type));
  if (remaining.length === 0) return 1; // already won everything there is
  return Math.max(...remaining.map((c) => c.frac));
}
