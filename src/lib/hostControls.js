import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function startGame(roomId) {
  await updateDoc(doc(db, "games", roomId), { status: "active" });
}

export async function endGameEarly(roomId) {
  await updateDoc(doc(db, "games", roomId), { status: "ended", endedEarly: true });
}
