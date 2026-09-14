// A static, illustrative ticket for the landing page hero.
// 0 = blank cell. "marked" numbers render teal, the single "latest" renders amber.
const SAMPLE_GRID = [
  [4, 0, 0, 0, 41, 0, 0, 78, 89],
  [0, 12, 0, 33, 0, 52, 0, 67, 85],
  [0, 17, 0, 46, 58, 0, 0, 72, 90],
];

const MARKED = new Set([4, 12, 33, 41, 52, 67, 78, 85, 90]);
const LATEST = 67;

export default function TicketPreview() {
  return (
    <div className="inline-block bg-[var(--paper)] border-2 border-[var(--ink)] rounded-sm shadow-[6px_6px_0_var(--ink)]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b-2 border-dashed border-[var(--line)]">
        <span className="font-display italic text-lg text-[var(--teal-deep)]">
          Tambola Live
        </span>
        <span className="font-mono-num text-xs tracking-wider text-[var(--ink)]/60">
          #A17F92
        </span>
      </div>
      <div className="grid grid-cols-9 gap-1 p-3">
        {SAMPLE_GRID.flat().map((num, i) => {
          const isBlank = num === 0;
          const isLatest = num === LATEST;
          const isMarked = MARKED.has(num);
          return (
            <div
              key={i}
              className={[
                "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm font-mono-num text-sm sm:text-base border",
                isBlank
                  ? "bg-[var(--sand)] border-[var(--line)]"
                  : isLatest
                  ? "bg-[var(--amber)] border-[var(--amber-deep)] text-white font-bold"
                  : isMarked
                  ? "bg-[var(--teal)] border-[var(--teal-deep)] text-white"
                  : "bg-white border-[var(--ink)]/20 text-[var(--ink)]",
              ].join(" ")}
            >
              {isBlank ? "" : num}
            </div>
          );
        })}
      </div>
    </div>
  );
}
