import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { callNextNumber } from "../lib/gameplay";
import { endGameEarly } from "../lib/hostControls";
import { unflattenGrid } from "../lib/ticket";
import { awardPatternNumbers, ticketProgressFraction } from "../lib/awards";
import { primeAudio } from "../lib/audio";
import { useAnnounceNumber } from "../hooks/useAnnounceNumber";
import { useConfettiOnIncrease } from "../hooks/useConfettiOnIncrease";
import TicketGrid from "../components/TicketGrid";
import NumberBoard from "../components/NumberBoard";
import Confetti from "../components/Confetti";

const AUTO_CALL_INTERVALS = [3, 5, 8, 10];
const TICKETS_PER_PAGE = 6;

export default function HostGamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(undefined);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [audioOn, setAudioOn] = useState(true);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [page, setPage] = useState(1);
  const callingRef = useRef(false); // guards overlapping calls from the interval

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

  useEffect(() => {
    if (game && game.status === "ended") {
      navigate(`/host/${roomId}/summary`);
    }
  }, [game, roomId, navigate]);

  const calledSet = useMemo(() => new Set(game?.calledNumbers || []), [game]);
  const awardsByType = useMemo(() => {
    const map = new Map();
    (game?.awards || []).forEach((a) => map.set(a.type, a));
    return map;
  }, [game]);

  const totalWinners = useMemo(
    () => (game?.awards || []).reduce((sum, a) => sum + (a.winners?.length || 0), 0),
    [game]
  );
  const showConfetti = useConfettiOnIncrease(totalWinners);

  // Every booked ticket, ranked so tickets that have already won float to
  // the very top (most-awards-first), and among the rest, whoever is
  // closest to their next award comes next — a live "who's about to win"
  // board instead of having to click into each award's winner list.
  const rankedTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === "booked")
      .map((t) => {
        const grid = unflattenGrid(t.grid);
        const wonTypes = t.awardsWon || [];
        return {
          ...t,
          grid,
          wonCount: wonTypes.length,
          progress: ticketProgressFraction(grid, calledSet, wonTypes),
        };
      })
      .sort((a, b) => {
        if (b.wonCount !== a.wonCount) return b.wonCount - a.wonCount;
        return b.progress - a.progress;
      });
  }, [tickets, calledSet]);

  const totalPages = Math.ceil(rankedTickets.length / TICKETS_PER_PAGE);
  const pageTickets = rankedTickets.slice(
    (page - 1) * TICKETS_PER_PAGE,
    page * TICKETS_PER_PAGE
  );

  async function handleNextNumber() {
    if (callingRef.current) return;
    callingRef.current = true;
    setError("");
    try {
      await callNextNumber(roomId);
    } catch (err) {
      console.error(err);
      setError(err.message || "Couldn't call the next number.");
    } finally {
      callingRef.current = false;
    }
  }

  // Calling is fully automatic once the game is active — there's no manual
  // "which number" button anymore, only pause/resume and a speed control.
  useEffect(() => {
    if (paused || !game || game.status !== "active") return;
    const id = setInterval(handleNextNumber, intervalSeconds * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, intervalSeconds, game?.status, roomId]);

  useAnnounceNumber(game?.currentNumber, audioOn);

  async function handleEndGame() {
    setEnding(true);
    try {
      await endGameEarly(roomId);
    } finally {
      setEnding(false);
    }
  }

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

  const allCalled = (game.calledNumbers || []).length >= 90;

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <Confetti active={showConfetti} />

      <div className="w-full max-w-md flex items-center justify-between mb-1">
        <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40">
          Room {roomId}
        </p>
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

      {/* Current number */}
      <div className="my-4 w-32 h-32 rounded-full bg-[var(--teal)] border-4 border-[var(--teal-deep)] flex items-center justify-center">
        <span className="font-mono-num text-5xl text-white">
          {game.currentNumber ?? "—"}
        </span>
      </div>

      {error && <p className="text-sm text-[var(--amber-deep)] mb-3">{error}</p>}

      <p className="text-sm text-[var(--ink)]/50 mb-3">
        {allCalled
          ? "All numbers called"
          : paused
          ? "Calling paused"
          : "Calling automatically…"}
      </p>

      <div className="flex items-center gap-3 mb-6 text-sm">
        <button
          onClick={() => setPaused((p) => !p)}
          disabled={allCalled}
          className="py-2 px-5 bg-[var(--amber)] text-white font-medium rounded-sm border-2 border-[var(--amber-deep)] shadow-[3px_3px_0_var(--amber-deep)] disabled:opacity-50"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <select
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          className="py-2 px-2 border-2 border-[var(--ink)]/20 rounded-sm bg-white"
        >
          {AUTO_CALL_INTERVALS.map((s) => (
            <option key={s} value={s}>
              every {s}s
            </option>
          ))}
        </select>
      </div>

      {!confirmingEnd ? (
        <button
          onClick={() => setConfirmingEnd(true)}
          className="mb-8 text-sm text-[var(--amber-deep)] underline underline-offset-4"
        >
          End game early
        </button>
      ) : (
        <div className="mb-8 bg-white border-2 border-[var(--amber-deep)] rounded-sm p-4 text-center max-w-xs">
          <p className="text-sm mb-3">
            End the game now? Players will be notified it ended early, and
            no more numbers will be called.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEndGame}
              disabled={ending}
              className="flex-1 py-2 bg-[var(--amber-deep)] text-white text-sm font-medium rounded-sm disabled:opacity-50"
            >
              {ending ? "Ending…" : "Yes, end it"}
            </button>
            <button
              onClick={() => setConfirmingEnd(false)}
              className="flex-1 py-2 border-2 border-[var(--ink)]/20 text-sm font-medium rounded-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 1-90 board */}
      <div className="mb-10">
        <NumberBoard calledNumbers={game.calledNumbers} currentNumber={game.currentNumber} />
      </div>

      {/* Awards panel — just slot counts now; per-ticket detail lives below */}
      <div className="w-full max-w-md mb-10">
        <h2 className="font-display text-xl mb-3">Awards</h2>
        <div className="space-y-3">
          {(game.awards || []).map((award) => {
            const isFull = award.winners.length >= award.maxWinners;
            return (
              <div
                key={award.id}
                className={[
                  "bg-white border-2 rounded-sm p-3 flex items-center justify-between",
                  isFull ? "border-[var(--teal-deep)]" : "border-[var(--ink)]/10",
                ].join(" ")}
              >
                <span className="font-medium">{award.name}</span>
                <span className="text-sm text-[var(--ink)]/50">
                  {award.winners.length}/{award.maxWinners}
                  {(!award.type || award.type === "custom") && (
                    <span className="ml-2 text-[var(--ink)]/30">manual</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tickets in play — sorted so winners rise to the top, and among the
          rest, whoever is closest to their next award comes next. */}
      {rankedTickets.length > 0 && (
        <div className="w-full max-w-3xl">
          <h2 className="font-display text-xl mb-3 text-center">Tickets in play</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
            {pageTickets.map((t) => {
              const wonAwards = (t.awardsWon || [])
                .map((type) => awardsByType.get(type))
                .filter(Boolean);
              const highlightNumbers = new Set(
                wonAwards.flatMap((a) => awardPatternNumbers(t.grid, a.type, calledSet))
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
                    <span className="text-xs text-[var(--ink)]/35">
                      {Math.round(t.progress * 100)}% to next award
                    </span>
                  )}
                  <TicketGrid
                    grid={t.grid}
                    markedNumbers={calledSet}
                    latestNumber={game.currentNumber}
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
    </div>
  );
}
