// Full 1-90 board, styled with the exact same "paper ticket" chrome as
// TicketGrid (paper background, thick ink border, drop shadow, dashed
// header divider) so it reads as part of the same visual language instead
// of a generic UI grid.
export default function NumberBoard({ calledNumbers = [], currentNumber = null }) {
  const calledSet = new Set(calledNumbers);

  return (
    <div className="inline-block bg-[var(--paper)] border-2 border-[var(--ink)] rounded-sm shadow-[4px_4px_0_var(--ink)]">
      <div className="px-3 pt-2 pb-1 border-b-2 border-dashed border-[var(--line)] font-mono-num text-xs tracking-wider text-[var(--ink)]/60 text-center">
        NUMBERS CALLED
      </div>
      <div className="grid grid-cols-10 gap-1 p-2">
        {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
          const isCalled = calledSet.has(n);
          const isCurrent = n === currentNumber;
          return (
            <div
              key={n}
              className={[
                "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-sm font-mono-num text-[10px] sm:text-xs border",
                isCurrent
                  ? "bg-[var(--amber)] border-[var(--amber-deep)] text-white font-bold"
                  : isCalled
                  ? "bg-[var(--teal)] border-[var(--teal-deep)] text-white"
                  : "bg-white border-[var(--ink)]/20 text-[var(--ink)]",
              ].join(" ")}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
