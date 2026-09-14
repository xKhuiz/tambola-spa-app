import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateTicket, flattenGrid } from "./ticket";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function randomCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export async function generateUniqueRoomId() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomCode(6);
    const snap = await getDoc(doc(db, "games", candidate));
    if (!snap.exists()) return candidate;
  }
  throw new Error("Could not generate a free room code, try again.");
}

export async function createGame(hostUid, { awards, maxTickets }) {
  const roomId = await generateUniqueRoomId();
  await setDoc(doc(db, "games", roomId), {
    hostUid,
    status: "setup",
    awards: awards.map((a) => ({ ...a, winners: [] })),
    maxTickets,
    ticketsBooked: 0,
    calledNumbers: [],
    currentNumber: null,
    endedEarly: false,
    createdAt: serverTimestamp(),
  });

  // Pre-generate the full ticket pool up front so players can browse and
  // pick specific tickets, rather than being handed random ones at booking
  // time. Firestore batches cap at 500 writes; maxTickets caps at 200, so
  // one batch is always enough.
  //
  // status: "available" | "pending" | "booked" — bookings now require host
  // approval, so claiming a ticket moves it to "pending" first; only
  // "booked" tickets are treated as real players by the calling/award
  // logic.
  const batch = writeBatch(db);
  const ticketsRef = collection(db, "games", roomId, "tickets");
  for (let i = 0; i < maxTickets; i++) {
    const ref = doc(ticketsRef);
    batch.set(ref, {
      ticketNumber: i + 1,
      grid: flattenGrid(generateTicket()),
      status: "available",
      ownerId: null,
      ownerName: null,
      markedNumbers: [],
      awardsWon: [],
    });
  }
  await batch.commit();

  return roomId;
}
