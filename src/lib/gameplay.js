import { doc, collection, getDocs, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { unflattenGrid } from "./ticket";
import { checkAllAwards } from "./awards";

// Calls the next random un-called number (1-90), then re-checks every
// booked ticket against the new set of called numbers and grants any
// newly-qualified standard awards (up to each award's maxWinners), all in
// a single transaction. Ends the game once every standard award is full or
// all 90 numbers have been called.
export async function callNextNumber(roomId) {
  const gameRef = doc(db, "games", roomId);
  const ticketsRef = collection(db, "games", roomId, "tickets");

  // Ticket documents are created once at setup and never added to afterward
  // — only ownership/awardsWon change — so fetching the id list just before
  // the transaction (rather than inside it, where queries aren't allowed)
  // is safe; the transaction re-reads each ticket's live data by ref.
  const ticketsSnap = await getDocs(ticketsRef);
  const bookedTicketRefs = ticketsSnap.docs
    .filter((d) => d.data().status === "booked")
    .map((d) => doc(db, "games", roomId, "tickets", d.id));

  return runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("This room no longer exists.");
    const game = gameSnap.data();

    if (game.status !== "active") {
      throw new Error("The game isn't active.");
    }

    const calledSoFar = game.calledNumbers || [];
    const available = [];
    for (let n = 1; n <= 90; n++) {
      if (!calledSoFar.includes(n)) available.push(n);
    }
    if (available.length === 0) {
      tx.update(gameRef, { status: "ended" });
      return { ended: true, number: null };
    }

    const newNumber = available[Math.floor(Math.random() * available.length)];
    const newCalledNumbers = [...calledSoFar, newNumber];
    const calledSet = new Set(newCalledNumbers);

    // All reads must happen before any writes in a Firestore transaction.
    const ticketSnaps = await Promise.all(bookedTicketRefs.map((ref) => tx.get(ref)));

    const ticketInfos = ticketSnaps
      .filter((snap) => snap.exists())
      .map((snap) => {
        const data = snap.data();
        const grid = unflattenGrid(data.grid);
        const alreadyWon = data.awardsWon || [];
        const wonNow = checkAllAwards(grid, calledSet);
        const newTypes = wonNow.filter((t) => !alreadyWon.includes(t));
        return {
          ref: snap.ref,
          ticketNumber: data.ticketNumber,
          ownerName: data.ownerName,
          alreadyWon,
          newTypes,
        };
      })
      .sort((a, b) => a.ticketNumber - b.ticketNumber); // deterministic tie-break

    // Group newly-qualifying tickets by award type, in ticket-number order.
    const candidatesByType = {};
    ticketInfos.forEach((info) => {
      info.newTypes.forEach((type) => {
        (candidatesByType[type] ||= []).push(info);
      });
    });

    // Award up to each award's remaining winner slots.
    const updatedAwards = game.awards.map((award) => ({
      ...award,
      winners: [...(award.winners || [])],
    }));
    const ticketNewAwardTypes = new Map(); // ticketRef.id -> [types granted]

    updatedAwards.forEach((award) => {
      if (!award.type || award.type === "custom") return; // manual-only
      const remaining = award.maxWinners - award.winners.length;
      if (remaining <= 0) return;
      const chosen = (candidatesByType[award.type] || []).slice(0, remaining);
      chosen.forEach((c) => {
        award.winners.push({
          ticketId: c.ref.id,
          ticketNumber: c.ticketNumber,
          playerName: c.ownerName,
        });
        const existing = ticketNewAwardTypes.get(c.ref.id) || [];
        existing.push(award.type);
        ticketNewAwardTypes.set(c.ref.id, existing);
      });
    });

    ticketInfos.forEach((info) => {
      const granted = ticketNewAwardTypes.get(info.ref.id);
      if (granted?.length) {
        tx.update(info.ref, { awardsWon: [...info.alreadyWon, ...granted] });
      }
    });

    const standardAwards = updatedAwards.filter((a) => a.type && a.type !== "custom");
    const allAwardsFull =
      standardAwards.length > 0 &&
      standardAwards.every((a) => a.winners.length >= a.maxWinners);
    const shouldEnd = allAwardsFull || newCalledNumbers.length === 90;

    tx.update(gameRef, {
      calledNumbers: newCalledNumbers,
      currentNumber: newNumber,
      awards: updatedAwards,
      status: shouldEnd ? "ended" : "active",
    });

    return { ended: shouldEnd, number: newNumber };
  });
}
