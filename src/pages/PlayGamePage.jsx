import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePlayerAuth } from "../hooks/usePlayerAuth";
import { unflattenGrid } from "../lib/ticket";
import { primeAudio } from "../lib/audio";
import { useAnnounceNumber } from "../hooks/useAnnounceNumber";
import { useConfettiOnIncrease } from "../hooks/useConfettiOnIncrease";
import TicketGrid from "../components/TicketGrid";
import NumberBoard from "../components/NumberBoard";
import Confetti from "../components/Confetti";

export default function PlayGamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { uid, loading: authLoading } = usePlayerAuth();

  const [game, setGame] = useState(undefined);
  const [tickets, setTickets] = useState([]);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    // Wait for anonymous auth to actually resolve before deciding there's
    // no identity — uid starts null for a moment on every load.
    if (authLoading) return;
    if (!uid) {
      navigate(`/play/${roomId}`);
    }
  }, [uid, authLoading, roomId, navigate]);

  useEffect(() => {
    const ref = doc(db, "games", roomId);
    const unsub = onSnapshot(ref, (snap) => setGame(snap.exists() ? snap.data() : null));
    return unsub;
  }, [roomId]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "games", roomId, "tickets"),
      where("ownerId", "==", uid)
    );
    // A fresh onSnapshot subscription here is what makes reconnects work:
    // if the tab loses network or gets backgrounded and comes back, this
    // listener re-syncs called numbers, marks, and awards automatically —
    // no manual reconciliation needed.
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId, uid]);

  useEffect(() => {
    if (game && game.status === "ended") {
      navigate(`/play/${roomId}/summary`);
    }
  }, [game, roomId, navigate]);

  useAnnounceNumber(game?.currentNumber, audioOn);

  const calledNumbers = game?.calledNumbers || [];
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const awardsByType = useMemo(() => {
    const map = new Map();
    (game?.awards || []).forEach((a) => map.set(a.type, a));
    return map;
  }, [game]);

  // Tickets with at least one award float to the top.
  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const aWon = (a.awardsWon || []).length;
        const bWon = (b.awardsWon || []).length;
        if (aWon !== bWon) return bWon - aWon;
        return a.ticketNumber - b.ticketNumber;
      }),
    [tickets]
  );

  const totalMyWins = useMemo(
    () => tickets.reduce((sum, t) => sum + (t.awardsWon?.length || 0), 0),
    [tickets]
  );
  const showConfetti = useConfettiOnIncrease(totalMyWins);

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

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <Confetti active={showConfetti} />

      <div className="w-full max-w-md flex justify-end mb-2">
        <button
          onClick={() => {
            setAudioOn((v) => !v);
            primeAudio();
          }}
          className="text-sm text-[var(--ink)]/50"
          aria-label={audioOn ? "Mute number announcements" : "Unmute number announcements"}
        >
          {audioOn ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Full 1-90 board, called numbers highlighted as they land */}
      <div className="mb-6">
        <NumberBoard calledNumbers={calledNumbers} currentNumber={game.currentNumber} />
      </div>

      {/* Current number */}
      <div className="mb-8 w-24 h-24 rounded-full bg-[var(--teal)] border-4 border-[var(--teal-deep)] flex items-center justify-center">
        <span className="font-mono-num text-3xl text-white">
          {game.currentNumber ?? "—"}
        </span>
      </div>

      <div className="flex flex-col gap-6 items-center w-full">
        {sortedTickets.map((t) => {
          const marked = calledSet;
          const wonAwards = (t.awardsWon || [])
            .map((type) => awardsByType.get(type))
            .filter(Boolean);

          return (
            <div key={t.id} className="flex flex-col items-center gap-2">
              {wonAwards.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {wonAwards.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--amber)] text-white"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
              <TicketGrid
                grid={unflattenGrid(t.grid)}
                markedNumbers={marked}
                latestNumber={game.currentNumber}
                label={`Ticket ${t.ticketNumber}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
