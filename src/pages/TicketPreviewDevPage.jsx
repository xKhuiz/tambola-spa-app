import { useState } from "react";
import { generateTicket } from "../lib/ticket";
import TicketGrid from "../components/TicketGrid";

export default function TicketPreviewDevPage() {
  const [seed, setSeed] = useState(0);
  const tickets = Array.from({ length: 5 }, () => generateTicket());

  return (
    <div className="min-h-screen px-5 py-10 flex flex-col items-center">
      <h1 className="font-display text-2xl mb-1">Ticket generator preview</h1>
      <p className="text-sm text-[var(--ink)]/50 mb-6">
        Dev-only page — confirm each row has 5 numbers, columns match their
        ranges, and nothing repeats.
      </p>
      <button
        onClick={() => setSeed((s) => s + 1)}
        className="mb-8 py-2 px-4 bg-[var(--teal)] text-white rounded-sm border-2 border-[var(--teal-deep)] text-sm"
      >
        Regenerate
      </button>
      <div key={seed} className="flex flex-col gap-4 items-center">
        {tickets.map((grid, i) => (
          <TicketGrid key={i} grid={grid} label={`Sample ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
