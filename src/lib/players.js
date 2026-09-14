import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

function storageKey(roomId) {
  return `tambola:player:${roomId}`;
}

export function getStoredPlayerId(roomId) {
  return localStorage.getItem(storageKey(roomId));
}

function setStoredPlayerId(roomId, playerId) {
  localStorage.setItem(storageKey(roomId), playerId);
}

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

export async function joinGame(roomId, name, phone) {
  const playerId = crypto.randomUUID();
  await setDoc(doc(db, "games", roomId, "players", playerId), {
    name: name.trim(),
    phone: normalizeIndianPhone(phone),
    ticketIds: [],
    joinedAt: serverTimestamp(),
  });
  setStoredPlayerId(roomId, playerId);
  return playerId;
}
