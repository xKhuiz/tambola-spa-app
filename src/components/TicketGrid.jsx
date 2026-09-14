// Renders any 3x9 ticket grid using the teal/amber/blank convention.
// markedNumbers: Set of numbers already marked on this ticket.
// latestNumber: the most recently called number overall (highlighted amber
// if present on this ticket, even if also marked).
// highlightNumbers: Set of numbers to ring in gold — used to call out the
// specific cells that make up a won award's pattern (a line, the corners,
// etc.), layered on top of whatever fill color the cell already has.
export default function TicketGrid({
  grid,
  markedNumbers = new Set(),
  latestNumber = null,
  highlightNumbers = null,
  label,
  onCellTap,
  size = "normal",
}) {
  const cellSize =
    size === "compact"
      ? "w-5 h-5 sm:w-6 sm:h-6 text-[9px] sm:text-[10px]"
      : "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm";

  return (
    <div className="inline-block bg-[var(--paper)] border-2 border-[var(--ink)] rounded-sm shadow-[4px_4px_0_var(--ink)]">
      {label && (
        <div className="px-3 pt-2 pb-1 border-b-2 border-dashed border-[var(--line)] font-mono-num text-xs tracking-wider text-[var(--ink)]/60">
          {label}
        </div>
      )}
      <div className={size === "compact" ? "grid grid-cols-9 gap-0.5 p-1.5" : "grid grid-cols-9 gap-1 p-2"}>
        {grid.flat().map((num, i) => {
          const isBlank = num === 0;
          const isLatest = num === latestNumber;
          const isMarked = markedNumbers.has(num);
          const isHighlighted = !isBlank && highlightNumbers?.has(num);

          const cellClasses = [
            cellSize,
            "flex items-center justify-center rounded-sm font-mono-num border",
            isBlank
              ? "bg-[var(--sand)] border-[var(--line)]"
              : isLatest
              ? "bg-[var(--amber)] border-[var(--amber-deep)] text-white font-bold"
              : isMarked
              ? "bg-[var(--teal)] border-[var(--teal-deep)] text-white"
              : "bg-white border-[var(--ink)]/20 text-[var(--ink)]",
            isHighlighted ? "ring-2 ring-[var(--gold)] ring-offset-1 ring-offset-[var(--paper)]" : "",
          ].join(" ");

          // No tap handler (e.g. a browsable/preview ticket): render a plain
          // div so clicks pass through to a parent card's onClick instead of
          // being swallowed by a disabled <button>.
          if (!onCellTap || isBlank) {
            return (
              <div key={i} className={cellClasses}>
                {isBlank ? "" : num}
              </div>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onCellTap(num)}
              className={`${cellClasses} cursor-pointer`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
