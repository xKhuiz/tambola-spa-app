const COLORS = ["#0f5257", "#ef8b2c", "#d4af37", "#c96f1a", "#fbf3e4"];

// A short, lightweight confetti burst — plain CSS animation, no canvas or
// external library. Renders nothing when `active` is false, so mounting it
// permanently and toggling `active` is cheap.
export default function Confetti({ active }) {
  if (!active) return null;

  const pieces = Array.from({ length: 36 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 1.6 + Math.random() * 0.9;
    const color = COLORS[i % COLORS.length];
    const size = 6 + Math.random() * 6;
    return { id: i, left, delay, duration, color, size };
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
