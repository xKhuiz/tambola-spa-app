import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Indian mobile numbers: 10 digits, first digit 6-9. Accepts an optional
// +91 / 91 / 0 prefix and strips spaces or dashes before checking.
export function isValidIndianPhone(raw) {
  const digits = raw.replace(/[\s-]/g, "");
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(digits);
}

function normalizeIndianPhone(raw) {
  const digits = raw.replace(/[\s-]/g, "").replace(/^(\+91|91|0)/, "");
  return `+91${digits}`;
}

// Checks whether this (already-authenticated) uid has already joined this
// room — e.g. a returning/reconnecting player — so the name/phone form can
// be skipped.
export async function getExistingPlayer(roomId, uid) {
  const snap = await getDoc(doc(db, "games", roomId, "players", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Creates the player doc at the given (real, Firebase-authenticated) uid.
// Identity now comes entirely from Firebase Anonymous Auth — there's no
// separate random id to generate or cache ourselves anymore.
export async function joinGame(roomId, uid, name, phone) {
  await setDoc(doc(db, "games", roomId, "players", uid), {
    name: name.trim(),
    phone: normalizeIndianPhone(phone),
    ticketIds: [],
    joinedAt: serverTimestamp(),
  });
}
