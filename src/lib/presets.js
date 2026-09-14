import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export async function savePreset(hostUid, name, { awards, maxTickets }) {
  await addDoc(collection(db, "presets"), {
    hostUid,
    name,
    awards,
    maxTickets,
    createdAt: serverTimestamp(),
  });
}

export async function loadPresets(hostUid) {
  const q = query(collection(db, "presets"), where("hostUid", "==", hostUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
