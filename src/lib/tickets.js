import { doc, runTransaction, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";

// Claims a specific set of already-generated tickets (from the pool created
// at game setup) into "pending" status for a player. This no longer books
// them outright — the host must approve each request before it counts as a
// real booking (see approveTicket/rejectTicket below). Wrapped in a
// transaction so two players can't both claim the same ticket.
export async function requestTickets(roomId, playerId, playerName, ticketIds) {
  if (ticketIds.length === 0) return;

  const gameRef = doc(db, "games", roomId);
  const playerRef = doc(db, "games", roomId, "players", playerId);
  const ticketRefs = ticketIds.map((id) => doc(db, "games", roomId, "tickets", id));

  await runTransaction(db, async (tx) => {
    // All reads must happen before any writes in a Firestore transaction.
    const gameSnap = await tx.get(gameRef);
    const ticketSnaps = await Promise.all(ticketRefs.map((ref) => tx.get(ref)));

    if (!gameSnap.exists()) throw new Error("This room no longer exists.");
    if (gameSnap.data().status !== "setup") {
      throw new Error("Ticket booking is closed — the game has started.");
    }

    const alreadyTaken = [];
    ticketSnaps.forEach((snap, i) => {
      if (!snap.exists() || snap.data().ownerId) {
        alreadyTaken.push(snap.data()?.ticketNumber ?? ticketIds[i]);
      }
    });
    if (alreadyTaken.length > 0) {
      throw new Error(
        `Ticket ${alreadyTaken.join(", ")} just got taken by someone else — pick again.`
      );
    }

    // Counted towards ticketsBooked immediately (reserved) so two players
    // can't both push past maxTickets while requests are still pending;
    // rejectTicket() below reverses this if the host declines.
    ticketRefs.forEach((ref) => {
      tx.update(ref, { ownerId: playerId, ownerName: playerName, status: "pending" });
    });
    tx.update(gameRef, { ticketsBooked: increment(ticketIds.length) });
    tx.update(playerRef, { ticketIds: arrayUnion(...ticketIds) });
  });
}

export async function approveTicket(roomId, ticketId) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "games", roomId, "tickets", ticketId);
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== "pending") return;
    tx.update(ref, { status: "booked" });
  });
}

export async function rejectTicket(roomId, ticketId) {
  const gameRef = doc(db, "games", roomId);
  const ticketRef = doc(db, "games", roomId, "tickets", ticketId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists() || snap.data().status !== "pending") return;
    const { ownerId } = snap.data();

    tx.update(ticketRef, {
      status: "available",
      ownerId: null,
      ownerName: null,
    });
    tx.update(gameRef, { ticketsBooked: increment(-1) });
    if (ownerId) {
      const playerRef = doc(db, "games", roomId, "players", ownerId);
      tx.update(playerRef, { ticketIds: arrayRemove(ticketRef.id) });
    }
  });
}
