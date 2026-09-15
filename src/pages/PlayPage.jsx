import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePlayerAuth } from "../hooks/usePlayerAuth";
import { getExistingPlayer, joinGame, isValidIndianPhone } from "../lib/players";
import { requestTickets } from "../lib/tickets";
import { unflattenGrid } from "../lib/ticket";
import TicketGrid from "../components/TicketGrid";

export default function PlayPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { uid, loading: authLoading, error: authError } = usePlayerAuth();

  const [game, setGame] = useState(undefined); // undefined = loading, null = not found
  // undefined = still checking Firestore, null = not joined yet, object = joined
  const [existingPlayer, setExistingPlayer] = useState(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [allTickets, setAllTickets] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [page, setPage] = useState(1);
  const TICKETS_PER_PAGE = 6;

  // Subscribe to the game document.
  useEffect(() => {
    const ref = doc(db, "games", roomId);
    const unsub = onSnapshot(
      ref,
      (snap) => setGame(snap.exists() ? snap.data() : null),
      () => setGame(null)
    );
    return unsub;
  }, [roomId]);

  // Once we have a real (anonymous) Firebase identity, check whether this
  // uid already joined this room before — a reconnect, not a fresh join.
  useEffect(() => {
    if (!uid) return;
    getExistingPlayer(roomId, uid).then((p) => setExistingPlayer(p));
  }, [roomId, uid]);

  // Subscribe to the full ticket pool for this room, so players can browse
  // and choose specific tickets — including ones already taken, so we can
  // show them as booked rather than offer them.
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "games", roomId, "tickets"),
      orderBy("ticketNumber")
    );
    const unsub = onSnapshot(q, (snap) => {
      setAllTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId, uid]);

  // Once the host starts the game, move players to the live game screen.
  useEffect(() => {
    if (game && game.status === "active") {
      navigate(`/play/${roomId}/game`);
    }
  }, [game, roomId, navigate]);

  const myBookedTickets = useMemo(
    () => allTickets.filter((t) => t.ownerId === uid && t.status === "booked"),
    [allTickets, uid]
  );
  const myPendingTickets = useMemo(
    () => allTickets.filter((t) => t.ownerId === uid && t.status === "pending"),
    [allTickets, uid]
  );

  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");
    if (!name.trim()) {
      setJoinError("Enter a name so other players can recognize you.");
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setJoinError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setJoining(true);
    try {
      await joinGame(roomId, uid, name, phone);
      setExistingPlayer({ name: name.trim(), phone, ticketIds: [] });
    } catch (err) {
      console.error(err);
      setJoinError("Couldn't join the room. Try again.");
    } finally {
      setJoining(false);
    }
  }

  function toggleSelect(ticketId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  }

  async function handleConfirmBooking() {
    setBookError("");
    setBooking(true);
    try {
      await requestTickets(roomId, uid, existingPlayer?.name || "Player", [...selected]);
      setSelected(new Set());
    } catch (err) {
      setBookError(err.message || "Couldn't request those tickets. Try again.");
    } finally {
      setBooking(false);
    }
  }

  if (authError) {
    return <CenteredMessage title="Connection problem" text={authError} />;
  }

  if (game === undefined || authLoading || existingPlayer === undefined) {
    return <CenteredMessage text="Loading room…" />;
  }

  if (game === null) {
    return (
      <CenteredMessage
        title="Room not found"
        text={`No game with code ${roomId}. Double-check the code with your host.`}
      />
    );
  }

  if (!existingPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40 mb-1">
          Joining room
        </p>
        <h1 className="font-mono-num text-3xl tracking-widest mb-8">{roomId}</h1>
        <form onSubmit={handleJoin} className="w-full max-w-xs space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full py-3 px-3 bg-white border-2 border-[var(--ink)]/20 rounded-sm"
            autoFocus
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number (e.g. 98765 43210)"
            inputMode="tel"
            className="w-full py-3 px-3 bg-white border-2 border-[var(--ink)]/20 rounded-sm"
          />
          {joinError && <p className="text-sm text-[var(--amber-deep)]">{joinError}</p>}
          <button
            type="submit"
            disabled={joining}
            className="w-full py-4 bg-[var(--teal)] text-white font-medium rounded-sm border-2 border-[var(--teal-deep)] shadow-[4px_4px_0_var(--teal-deep)] disabled:opacity-60"
          >
            {joining ? "Joining…" : "Join room"}
          </button>
        </form>
      </div>
    );
  }

  const remaining = Math.max(0, (game.maxTickets || 0) - (game.ticketsBooked || 0));

  return (
    <div className="min-h-screen px-5 py-10 flex flex-col items-center">
      <p className="text-sm uppercase tracking-wide text-[var(--ink)]/40 mb-1">Room</p>
      <h1 className="font-mono-num text-3xl tracking-widest mb-2">{roomId}</h1>

      {myBookedTickets.length > 0 && (
        <div className="w-full max-w-3xl mb-8">
          <h2 className="font-display text-xl mb-3 text-center">Your tickets</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {myBookedTickets.map((t) => (
              <TicketGrid
                key={t.id}
                grid={unflattenGrid(t.grid)}
                label={`Ticket ${t.ticketNumber}`}
              />
            ))}
          </div>
        </div>
      )}

      {myPendingTickets.length > 0 && (
        <div className="w-full max-w-3xl mb-10">
          <h2 className="font-display text-lg mb-1 text-center text-[var(--amber-deep)]">
            Awaiting host approval
          </h2>
          <p className="text-sm text-[var(--ink)]/50 text-center mb-3">
            The host needs to confirm these before they're yours.
          </p>
          <div className="flex flex-wrap gap-4 justify-center opacity-80">
            {myPendingTickets.map((t) => (
              <TicketGrid
                key={t.id}
                grid={unflattenGrid(t.grid)}
                label={`Ticket ${t.ticketNumber}`}
              />
            ))}
          </div>
        </div>
      )}

      {game.status === "setup" && (
        <div className="w-full max-w-3xl">
          <p className="text-sm text-[var(--ink)]/60 mb-4 text-center">
            {remaining > 0
              ? `${remaining} of ${game.maxTickets} tickets left — tap any available ticket to select it`
              : "All tickets are booked"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {allTickets
              .slice((page - 1) * TICKETS_PER_PAGE, page * TICKETS_PER_PAGE)
              .map((t) => {
                const isMine = t.ownerId === uid;
                const isMinePending = isMine && t.status === "pending";
                const isMineBooked = isMine && t.status === "booked";
                const isTakenByOther = t.ownerId && !isMine;
                const isSelected = selected.has(t.id);
                const isAvailable = !isMine && !isTakenByOther;

                const borderColor = isMineBooked
                  ? "border-[var(--teal-deep)]"
                  : isMinePending
                  ? "border-[var(--amber-deep)]"
                  : isTakenByOther
                  ? "border-[var(--ink)]/15"
                  : isSelected
                  ? "border-[var(--amber-deep)]"
                  : "border-[var(--ink)]/15 hover:border-[var(--ink)]/30";

                const statusText = isMineBooked
                  ? "Yours"
                  : isMinePending
                  ? "Pending approval"
                  : isTakenByOther
                  ? "Booked"
                  : isSelected
                  ? "Selected"
                  : "Tap to select";

                const statusColor = isMineBooked
                  ? "text-[var(--teal-deep)]"
                  : isMinePending
                  ? "text-[var(--amber-deep)]"
                  : isTakenByOther
                  ? "text-[var(--ink)]/40"
                  : isSelected
                  ? "text-[var(--amber-deep)]"
                  : "text-[var(--ink)]/40";

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => toggleSelect(t.id)}
                    className={[
                      "flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all text-left",
                      borderColor,
                      isTakenByOther ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <TicketGrid grid={unflattenGrid(t.grid)} label={`Ticket ${t.ticketNumber}`} />
                    <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
                  </button>
                );
              })}
          </div>

          {allTickets.length > TICKETS_PER_PAGE && (
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="py-2 px-4 border-2 border-[var(--ink)]/20 rounded-sm text-sm disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-sm text-[var(--ink)]/50">
                Page {page} of {Math.ceil(allTickets.length / TICKETS_PER_PAGE)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.ceil(allTickets.length / TICKETS_PER_PAGE), p + 1)
                  )
                }
                disabled={page === Math.ceil(allTickets.length / TICKETS_PER_PAGE)}
                className="py-2 px-4 border-2 border-[var(--ink)]/20 rounded-sm text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}

          {bookError && (
            <p className="text-sm text-[var(--amber-deep)] text-center mb-3">{bookError}</p>
          )}

          {selected.size > 0 && (
            <button
              onClick={handleConfirmBooking}
              disabled={booking}
              className="w-full max-w-xs mx-auto block py-4 bg-[var(--amber)] text-white font-medium rounded-sm border-2 border-[var(--amber-deep)] shadow-[4px_4px_0_var(--amber-deep)] disabled:opacity-60"
            >
              {booking ? "Booking…" : `Book ${selected.size} ticket${selected.size > 1 ? "s" : ""}`}
            </button>
          )}

          <p className="text-center text-sm text-[var(--ink)]/40 mt-8">
            Waiting for the host to start the game…
          </p>
        </div>
      )}
    </div>
  );
}

function CenteredMessage({ title, text }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {title && <h1 className="font-display text-2xl mb-2">{title}</h1>}
      <p className="text-[var(--ink)]/60 max-w-sm">{text}</p>
    </div>
  );
}
