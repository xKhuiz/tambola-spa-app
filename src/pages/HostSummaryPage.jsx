import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { unflattenGrid } from "../lib/ticket";
import { awardPatternNumbers } from "../lib/awards";
import TicketGrid from "../components/TicketGrid";
import Confetti from "../components/Confetti";

const TICKETS_PER_PAGE = 6;

export default function HostSummaryPage() {
  const { roomId } = useParams();

  const [game, setGame] = useState(undefined);
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  useEffect(() => {
    const ref = doc(db, "games", roomId);
    const unsub = onSnapshot(ref, (snap) => setGame(snap.exists() ? snap.data() : null));
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "games", roomId, "tickets"), orderBy("ticketNumber"));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  const calledSet = useMemo(() => new Set(game?.calledNumbers || []), [game]);
  const awardsByType = useMemo(() => {
    const map = new Map();
    (game?.awards || []).forEach((a) => map.set(a.type, a));
    return map;
  }, [game]);

  const bookedTickets = useMemo(
    () => tickets.filter((t) => t.status === "booked" && (t.awardsWon || []).length > 0),
    [tickets]
  );

  const leaderboard = useMemo(() => {
    if (!game) return [];
    const ticketOwner = new Map(tickets.map((t) => [t.id, t]));
    const totals = new Map(); // ownerId -> { name, points }

    (game.awards || []).forEach((award) => {
      (award.winners || []).forEach((w) => {
        const ticket = ticketOwner.get(w.ticketId);
        const ownerId = ticket?.ownerId || w.playerName;
        const name = ticket?.ownerName || w.playerName;
        const entry = totals.get(ownerId) || { name, points: 0 };
        entry.points += award.points || 0;
        totals.set(ownerId, entry);
      });
    });

    return [...totals.values()].sort((a, b) => b.points - a.points);
  }, [game, tickets]);

  // Play the celebration once, the first time we know whether anyone won.
  useEffect(() => {
    if (confettiFired || !game) return;
    if (leaderboard.length > 0) {
      setShowConfetti(true);
      setConfettiFired(true);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [leaderboard, game, confettiFired]);

  if (game === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink)]/50">
        Loading…
      </div>
    );
  }
  if (game === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink)]/50">
        Room not found.
      </div>
    );
  }

  const pageTickets = bookedTickets.slice(
    (page - 1) * TICKETS_PER_PAGE,
    page * TICKETS_PER_PAGE
  );
  const totalPages = Math.ceil(bookedTickets.length / TICKETS_PER_PAGE);

  return (
    <div className="min-h-screen px-5 py-10 flex flex-col items-center">
      <Confetti active={showConfetti} />

      <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40 mb-1">
        {game.endedEarly ? "Ended early — " : "Game over — "}room {roomId}
      </p>
      <h1 className="font-display text-3xl mb-1">Final results</h1>
      {game.endedEarly && (
        <p className="text-sm text-[var(--amber-deep)] mb-6">
          The host ended this game before all numbers were called.
        </p>
      )}
      {!game.endedEarly && <div className="mb-8" />}

      <div className="w-full max-w-md mb-10">
        <h2 className="font-display text-xl mb-3">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-[var(--ink)]/40 text-center py-6 border-2 border-dashed border-[var(--line)] rounded-sm">
            No awards were won this game.
          </p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((entry, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-white border-2 border-[var(--ink)]/10 rounded-sm px-4 py-3"
              >
                <span className="font-medium">
                  <span className="text-[var(--ink)]/40 mr-2 font-mono-num">{i + 1}.</span>
                  {entry.name}
                </span>
                <span className="font-mono-num text-sm text-[var(--teal-deep)]">
                  {entry.points} pts
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="w-full max-w-md mb-10">
        <h2 className="font-display text-xl mb-3">Awards</h2>
        <div className="space-y-3">
          {(game.awards || []).map((award) => (
            <div key={award.id} className="bg-white border-2 border-[var(--ink)]/10 rounded-sm p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{award.name}</span>
                <span className="text-sm text-[var(--ink)]/50">{award.points} pts</span>
              </div>
              {award.winners?.length > 0 ? (
                <ul className="text-sm text-[var(--ink)]/70 space-y-0.5">
                  {award.winners.map((w, i) => (
                    <li key={i}>
                      {w.playerName} — Ticket {w.ticketNumber}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--ink)]/30">Not won</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {bookedTickets.length > 0 && (
        <div className="w-full max-w-3xl mb-10">
          <h2 className="font-display text-xl mb-3 text-center">Winning tickets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
            {pageTickets.map((t) => {
              const grid = unflattenGrid(t.grid);
              const wonAwards = (t.awardsWon || [])
                .map((type) => awardsByType.get(type))
                .filter(Boolean);
              const highlightNumbers = new Set(
                wonAwards.flatMap((a) => awardPatternNumbers(grid, a.type, calledSet))
              );

              return (
                <div key={t.id} className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium">{t.ownerName}</p>
                  {wonAwards.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {wonAwards.map((a) => (
                        <span
                          key={a.id}
                          className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--amber)] text-white"
                        >
                          🏆 {a.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--ink)]/35">No wins</span>
                  )}
                  <TicketGrid
                    grid={grid}
                    markedNumbers={calledSet}
                    highlightNumbers={highlightNumbers}
                    label={`Ticket ${t.ticketNumber}`}
                  />
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="py-2 px-4 border-2 border-[var(--ink)]/20 rounded-sm text-sm disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-sm text-[var(--ink)]/50">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="py-2 px-4 border-2 border-[var(--ink)]/20 rounded-sm text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <Link to="/" className="text-sm text-[var(--teal-deep)] underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}
