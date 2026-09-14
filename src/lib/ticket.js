// Generates a valid Tambola/Housie ticket: 3 rows x 9 columns.
// 0 = blank cell.
//
// Rules enforced:
// - Each row has exactly 5 numbers and 4 blanks.
// - Column c only contains numbers from its range (col 0: 1-9, col 1: 10-19,
//   ... col 8: 80-90).
// - Every column has at least 1 number, none has more than 3.
// - Numbers within a column read top-to-bottom in ascending order.
// - No duplicate numbers on the ticket (guaranteed since each column's pool
//   is disjoint and we draw without replacement within a column).

const COLUMN_RANGES = [
  [1, 9],
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, 90], // 11 numbers, everywhere else has 10
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rangeNumbers([lo, hi]) {
  const out = [];
  for (let n = lo; n <= hi; n++) out.push(n);
  return out;
}

// Decide how many numbers each of the 9 columns gets (sums to 15, each 1-3,
// respecting that each row still needs exactly 5 filled cells across 9 cols).
function pickColumnCounts() {
  const counts = new Array(9).fill(1); // start every column with 1 (15 - 9 = 6 left to distribute)
  let remaining = 15 - 9;
  const order = shuffle([...Array(9).keys()]);
  let i = 0;
  while (remaining > 0) {
    const col = order[i % 9];
    if (counts[col] < 3) {
      counts[col] += 1;
      remaining -= 1;
    }
    i += 1;
    // safety valve, should never trigger given 9 cols * max 3 = 27 >= 15
    if (i > 200) break;
  }
  return counts;
}

// Given column counts (sum 15), assign which row each column's numbers land
// in, so every row ends up with exactly 5 filled cells.
function pickRowAssignment(columnCounts) {
  // rowSlotsLeft tracks how many more filled cells each row still needs (starts at 5,5,5)
  const rowSlotsLeft = [5, 5, 5];
  // assignment[col] = array of row indices (length = columnCounts[col])
  const assignment = columnCounts.map(() => []);

  for (let col = 0; col < 9; col++) {
    const need = columnCounts[col];
    // rows this column can use: distinct rows, picked from those with slots left,
    // preferring rows with more remaining slots to keep things balanced
    const availableRows = [0, 1, 2]
      .filter((r) => rowSlotsLeft[r] > 0)
      .sort((a, b) => rowSlotsLeft[b] - rowSlotsLeft[a]);

    const chosen = shuffle(availableRows).slice(0, Math.min(need, availableRows.length));
    // if not enough distinct rows had room (rare edge case), fill remainder from any row with room
    while (chosen.length < need) {
      const fallback = [0, 1, 2].find((r) => rowSlotsLeft[r] > 0 && !chosen.includes(r));
      if (fallback === undefined) break;
      chosen.push(fallback);
    }

    chosen.forEach((r) => {
      rowSlotsLeft[r] -= 1;
    });
    assignment[col] = chosen;
  }

  return assignment;
}

export function generateTicket() {
  // Retry if the row-balancing edge case couldn't perfectly fill all rows
  // (extremely rare with this algorithm, but cheap to guard).
  for (let attempt = 0; attempt < 20; attempt++) {
    const columnCounts = pickColumnCounts();
    const rowAssignment = pickRowAssignment(columnCounts);
    const rowFillCount = [0, 0, 0];
    rowAssignment.forEach((rows) => rows.forEach((r) => (rowFillCount[r] += 1)));
    if (rowFillCount.some((c) => c !== 5)) continue; // retry

    const grid = [
      new Array(9).fill(0),
      new Array(9).fill(0),
      new Array(9).fill(0),
    ];

    for (let col = 0; col < 9; col++) {
      const need = columnCounts[col];
      if (need === 0) continue;
      const pool = shuffle(rangeNumbers(COLUMN_RANGES[col])).slice(0, need);
      pool.sort((a, b) => a - b); // ascending top-to-bottom
      const rows = [...rowAssignment[col]].sort((a, b) => a - b);
      rows.forEach((row, idx) => {
        grid[row][col] = pool[idx];
      });
    }

    return grid;
  }
  throw new Error("Failed to generate a valid ticket after multiple attempts.");
}

// Flat array of the 15 real numbers on a ticket (no blanks) — used by the
// award-checking logic in the next build step.
export function ticketNumbers(grid) {
  return grid.flat().filter((n) => n !== 0);
}

// Firestore rejects arrays-of-arrays ("nested arrays are not supported"),
// so the 3x9 grid must be flattened to a single 27-element array before
// being written, and reshaped back to 3x9 whenever it's read for display.
export function flattenGrid(grid) {
  return grid.flat();
}

export function unflattenGrid(flat) {
  return [flat.slice(0, 9), flat.slice(9, 18), flat.slice(18, 27)];
}
