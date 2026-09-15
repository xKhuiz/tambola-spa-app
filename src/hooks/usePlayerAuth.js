import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../lib/firebase";

// Gives every player a real, silent, persistent Firebase identity — no
// button, no visible sign-in step. Firebase persists this across reloads
// on the same browser (IndexedDB), which is what actually lets Firestore
// rules verify "is this really the person who booked ticket X" instead of
// just trusting whatever a client claims.
//
// Note for local testing: this identity is shared across all tabs of the
// same browser profile (that's how Firebase Auth persistence works). To
// simulate multiple players, use separate browser profiles/incognito
// windows, not multiple tabs of one normal window — same goes for testing
// as a player and a host in the same browser at once.
export function usePlayerAuth() {
  const [uid, setUid] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUid(firebaseUser.uid);
        return;
      }
      // No session yet (or the host just signed out elsewhere in this
      // browser) — start one anonymously. onAuthStateChanged fires again
      // once it resolves.
      signInAnonymously(auth).catch((err) => {
        console.error("Anonymous sign-in failed", err);
        setError(
          "Couldn't connect you to this game. Check your connection and reload."
        );
      });
    });
    return unsubscribe;
  }, []);

  return { uid, loading: !uid && !error, error };
}
