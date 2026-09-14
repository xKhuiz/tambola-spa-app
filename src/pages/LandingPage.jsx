import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TicketPreview from "../components/TicketPreview";

export default function LandingPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function handleHostClick() {
    if (user) {
      navigate("/host/create");
      return;
    }
    setSigningIn(true);
    try {
      await signInWithGoogle();
      navigate("/host/create");
    } catch (err) {
      console.error(err);
    } finally {
      setSigningIn(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const cleaned = roomId.trim().toUpperCase();
    if (!cleaned) {
      setJoinError("Enter the room code your host shared.");
      return;
    }
    navigate(`/play/${cleaned}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 sm:py-16">
      <div className="mb-10">
        <TicketPreview />
      </div>

      <h1 className="font-display text-4xl sm:text-5xl text-center text-[var(--ink)] mb-2">
        Call the numbers.
        <br />
        <span className="italic text-[var(--teal-deep)]">Claim the house.</span>
      </h1>
      <p className="text-[var(--ink)]/70 text-center max-w-sm mb-10">
        Tambola, played live — one caller, everyone's tickets updating in
        real time.
      </p>

      <div className="w-full max-w-sm space-y-6">
        <button
          onClick={handleHostClick}
          disabled={signingIn}
          className="w-full py-4 bg-[var(--teal)] text-white font-medium rounded-sm border-2 border-[var(--teal-deep)] shadow-[4px_4px_0_var(--teal-deep)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60"
        >
          {signingIn ? "Signing in…" : "Host a game"}
        </button>

        <div className="flex items-center gap-3 text-[var(--ink)]/40 text-sm">
          <div className="h-px flex-1 bg-[var(--line)]" />
          or join one
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <input
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setJoinError("");
            }}
            placeholder="Enter room code"
            className="w-full py-4 px-4 bg-white border-2 border-[var(--ink)]/20 rounded-sm font-mono-num text-lg tracking-widest text-center uppercase focus:outline-none focus:border-[var(--teal)]"
          />
          {joinError && (
            <p className="text-sm text-[var(--amber-deep)]">{joinError}</p>
          )}
          <button
            type="submit"
            className="w-full py-4 bg-[var(--amber)] text-white font-medium rounded-sm border-2 border-[var(--amber-deep)] shadow-[4px_4px_0_var(--amber-deep)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Join a game
          </button>
        </form>
      </div>

      {user && (
        <p className="mt-8 text-sm text-[var(--ink)]/50">
          Signed in as {user.displayName}
        </p>
      )}
    </div>
  );
}
