import { useEffect, useRef } from "react";
import { playNumberAudio } from "../lib/audio";

export function useAnnounceNumber(currentNumber, enabled = true) {
  const lastSpoken = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (currentNumber == null) return;
    if (lastSpoken.current === currentNumber) return; // avoid re-playing on unrelated re-renders
    lastSpoken.current = currentNumber;
    playNumberAudio(currentNumber);
  }, [currentNumber, enabled]);
}
