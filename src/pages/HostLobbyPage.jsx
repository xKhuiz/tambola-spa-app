import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { startGame } from "../lib/hostControls";
import { approveTicket, rejectTicket } from "../lib/tickets";
import { unflattenGrid } from "../lib/ticket";
import TicketGrid from "../components/TicketGrid";

export default function HostLobbyPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const joinUrl = `${window.location.origin}/play/${roomId}`;

  const [game, setGame] = useState(undefined);
  const [players, setPlayers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [previewTicketId, setPreviewTicketId] = useState(null);
  const [actingOn, setActingOn] = useState(null); // ticketId currently being approved/rejected

  useEffect(() => {
    const ref = doc(db, "games", roomId);
    const unsub = onSnapshot(ref, (snap) => setGame(snap.exists() ? snap.data() : null));
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "games", roomId, "players"), orderBy("joinedAt"));
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "games", roomId, "tickets"), orderBy("ticketNumber"));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  // Once the game is live, follow it to the calling screen instead of
  // sitting on the lobby.
  useEffect(() => {
    if (game && game.status === "active") {
      navigate(`/host/${roomId}/game`);
    }
  }, [game, roomId, navigate]);

  const pendingTickets = useMemo(
    () => tickets.filter((t) => t.status === "pending"),
    [tickets]
  );
  const approvedCount = useMemo(
    () => tickets.filter((t) => t.status === "booked").length,
    [tickets]
  );
  const previewTicket = tickets.find((t) => t.id === previewTicketId);

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      await startGame(roomId);
    } catch (err) {
      console.error(err);
      setError("Couldn't start the game. Try again.");
      setStarting(false);
    }
  }

  async function handleApprove(ticketId) {
    setActingOn(ticketId);
    try {
      await approveTicket(roomId, ticketId);
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(ticketId) {
    setActingOn(ticketId);
    try {
      await rejectTicket(roomId, ticketId);
      if (previewTicketId === ticketId) setPreviewTicketId(null);
    } finally {
      setActingOn(null);
    }
  }

  if (game === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink)]/50">
        Loading…
      </div>
    );
  }

  const canStart = approvedCount > 0;

  return (
    <div className="min-h-screen px-5 py-10 flex flex-col items-center">
      <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40 mb-1">
        Room created
      </p>
      <h1 className="font-mono-num text-4xl tracking-widest mb-3">{roomId}</h1>
      <p className="text-[var(--ink)]/60 text-center max-w-sm mb-2">
        Share this code, or the link below, with your players.
      </p>
      <button
        onClick={handleCopy}
        className="text-sm text-[var(--teal-deep)] underline underline-offset-4 mb-10 break-all"
      >
        {copied ? "Copied!" : joinUrl}
      </button>

      {pendingTickets.length > 0 && (
        <div className="w-full max-w-md mb-10">
          <h2 className="font-display text-xl mb-3 text-[var(--amber-deep)]">
            Approve bookings ({pendingTickets.length})
          </h2>
          <ul className="space-y-2">
            {pendingTickets.map((t) => (
              <li
                key={t.id}
                className="bg-white border-2 border-[var(--amber-deep)]/40 rounded-sm px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setPreviewTicketId(previewTicketId === t.id ? null : t.id)}
                    className="text-left"
                  >
                    <span className="font-medium">{t.ownerName}</span>
                    <span className="text-sm text-[var(--ink)]/50 ml-2">
                      Ticket {t.ticketNumber}
                    </span>
                  </button>
                </div>
                {previewTicketId === t.id && (
                  <div className="flex justify-center mb-3">
                    <TicketGrid grid={unflattenGrid(t.grid)} size="compact" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(t.id)}
                    disabled={actingOn === t.id}
                    className="flex-1 py-2 bg-[var(--teal)] text-white text-sm font-medium rounded-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(t.id)}
                    disabled={actingOn === t.id}
                    className="flex-1 py-2 border-2 border-[var(--ink)]/20 text-sm font-medium rounded-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Players</h2>
          <span className="text-sm text-[var(--ink)]/50">
            {approvedCount} of {game.maxTickets} tickets approved
          </span>
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-[var(--ink)]/40 text-center py-8 border-2 border-dashed border-[var(--line)] rounded-sm">
            Waiting for players to join…
          </p>
        ) : (
          <ul className="space-y-2 mb-8">
            {players.map((p) => {
              const approved = tickets.filter(
                (t) => t.ownerId === p.id && t.status === "booked"
              ).length;
              const pending = tickets.filter(
                (t) => t.ownerId === p.id && t.status === "pending"
              ).length;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-white border-2 border-[var(--ink)]/10 rounded-sm px-4 py-3"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-[var(--ink)]/50">
                    {approved} ticket{approved === 1 ? "" : "s"}
                    {pending > 0 && (
                      <span className="text-[var(--amber-deep)]"> · {pending} pending</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="text-sm text-[var(--amber-deep)] text-center mb-3">{error}</p>}

        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="w-full py-4 bg-[var(--teal)] text-white font-medium rounded-sm border-2 border-[var(--teal-deep)] shadow-[4px_4px_0_var(--teal-deep)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40"
        >
          {starting ? "Starting…" : "Start game"}
        </button>
        {!canStart && (
          <p className="text-center text-sm text-[var(--ink)]/40 mt-2">
            At least one ticket needs to be approved before you can start.
          </p>
        )}
      </div>
    </div>
  );
}
