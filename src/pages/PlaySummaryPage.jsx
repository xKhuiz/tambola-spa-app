import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getStoredPlayerId } from "../lib/players";
import { randomQuote } from "../lib/quotes";
import { unflattenGrid } from "../lib/ticket";
import { awardPatternNumbers } from "../lib/awards";
import TicketGrid from "../components/TicketGrid";
import Confetti from "../components/Confetti";

export default function PlaySummaryPage() {
  const { roomId } = useParams();
  const playerId = getStoredPlayerId(roomId);
  const quote = useMemo(() => randomQuote(), []);

  const [game, setGame] = useState(undefined);
  const [tickets, setTickets] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);

  useEffect(() => {
    const ref = doc(db, "games", roomId);
    const unsub = onSnapshot(ref, (snap) => setGame(snap.exists() ? snap.data() : null));
    return unsub;
  }, [roomId]);

  useEffect(() => {
    if (!playerId) return;
    const q = query(
      collection(db, "games", roomId, "tickets"),
      where("ownerId", "==", playerId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId, playerId]);

  const calledSet = useMemo(() => new Set(game?.calledNumbers || []), [game]);
  const awardsByType = useMemo(() => {
    const map = new Map();
    (game?.awards || []).forEach((a) => map.set(a.type, a));
    return map;
  }, [game]);

  const wins = useMemo(() => {
    const list = [];
    tickets.forEach((t) => {
      (t.awardsWon || []).forEach((type) => {
        const award = awardsByType.get(type);
        if (award) list.push({ award, ticketNumber: t.ticketNumber });
      });
    });
    return list;
  }, [tickets, awardsByType]);

  const totalPoints = wins.reduce((sum, w) => sum + (w.award.points || 0), 0);

  // Same celebration as the host sees, played once for players who won.
  useEffect(() => {
    if (confettiFired || tickets.length === 0) return;
    if (wins.length > 0) {
      setShowConfetti(true);
      setConfettiFired(true);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [wins, tickets, confettiFired]);

  if (game === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink)]/50">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 flex flex-col items-center text-center">
      <Confetti active={showConfetti} />

      <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40 mb-1">
        {game?.endedEarly ? "The host ended this game early" : "Game over"}
      </p>
      <h1 className="font-display text-3xl mb-8">Your recap</h1>

      {wins.length === 0 ? (
        <div className="max-w-xs mb-10">
          <p className="font-display italic text-xl text-[var(--teal-deep)] mb-2">
            "{quote}"
          </p>
        </div>
      ) : (
        <div className="w-full max-w-xs mb-10">
          <p className="font-mono-num text-4xl text-[var(--teal-deep)] mb-1">
            {totalPoints}
          </p>
          <p className="text-sm text-[var(--ink)]/50 mb-6">total points</p>
          <div className="space-y-2">
            {wins.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white border-2 border-[var(--ink)]/10 rounded-sm px-4 py-3"
              >
                <span className="font-medium">🏆 {w.award.name}</span>
                <span className="text-sm text-[var(--ink)]/50">
                  Ticket {w.ticketNumber}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="w-full max-w-md mb-10">
          <h2 className="font-display text-xl mb-1">Your tickets</h2>
          <p className="text-sm text-[var(--ink)]/50 mb-4">
            Review how each one played out.
          </p>
          <div className="flex flex-col gap-6 items-center">
            {tickets.map((t) => {
              const grid = unflattenGrid(t.grid);
              const wonAwards = (t.awardsWon || [])
                .map((type) => awardsByType.get(type))
                .filter(Boolean);
              const highlightNumbers = new Set(
                wonAwards.flatMap((a) => awardPatternNumbers(grid, a.type, calledSet))
              );
              return (
                <div key={t.id} className="flex flex-col items-center gap-2">
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
                    <span className="text-xs text-[var(--ink)]/35">No wins on this ticket</span>
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
        </div>
      )}

      <Link to="/" className="text-sm text-[var(--teal-deep)] underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}
