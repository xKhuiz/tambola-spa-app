import { useEffect, useRef, useState } from "react";

// Fires a ~2.5s confetti burst whenever `count` goes up from its previous
// value. Ignores the very first render (so loading a page that already has
// winners doesn't immediately burst confetti) and ignores decreases.
export function useConfettiOnIncrease(count) {
  const [active, setActive] = useState(false);
  const prevCount = useRef(null);

  useEffect(() => {
    if (prevCount.current === null) {
      prevCount.current = count;
      return;
    }
    if (count > prevCount.current) {
      setActive(true);
      const timer = setTimeout(() => setActive(false), 2500);
      prevCount.current = count;
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  return active;
}
