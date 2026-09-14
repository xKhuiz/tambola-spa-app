// Plays a bundled, pre-rendered audio clip for a called number instead of
// using the browser's speech synthesis — consistent voice across devices,
// works even where SpeechSynthesis is unavailable/blocked, and doesn't
// depend on the OS's installed voices. Files live in
// public/audio/numbers/{n}.mp3 and were generated offline (espeak-ng +
// ffmpeg) — see the numbers themselves for the full 1-90 set.
let currentAudio = null;

export function playNumberAudio(number) {
  if (typeof window === "undefined") return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = new Audio(`/audio/numbers/${number}.mp3`);
  currentAudio.play().catch(() => {
    // Autoplay can be blocked until a user gesture has occurred on the
    // page — primeAudio(), wired to the sound toggle button, covers that.
  });
}

// Mobile browsers often block audio playback until a real user gesture has
// happened on the page. Call this from a click handler (the sound toggle)
// to unlock playback for the rest of the session.
export function primeAudio() {
  if (typeof window === "undefined") return;
  const audio = new Audio(`/audio/numbers/1.mp3`);
  audio.volume = 0;
  audio.play().catch(() => {});
}
