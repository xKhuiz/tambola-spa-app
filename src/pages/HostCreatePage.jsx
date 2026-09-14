import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createGame } from "../lib/games";
import { savePreset, loadPresets } from "../lib/presets";
import { DEFAULT_AWARDS, nextAwardId, resolveAwardType } from "../lib/defaultAwards";

export default function HostCreatePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [awards, setAwards] = useState(DEFAULT_AWARDS);
  const [maxTickets, setMaxTickets] = useState(50);

  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    loadPresets(user.uid).then(setPresets).catch(console.error);
  }, [user]);

  function updateAward(id, field, value) {
    setAwards((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  }

  function removeAward(id) {
    setAwards((prev) => prev.filter((a) => a.id !== id));
  }

  function addAward() {
    setAwards((prev) => [
      ...prev,
      { id: nextAwardId(), name: "New award", type: "custom", maxWinners: 1, points: 10 },
    ]);
  }

  function applyPreset(presetId) {
    setSelectedPresetId(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setAwards(preset.awards.map((a) => ({ ...a, id: nextAwardId() })));
    setMaxTickets(preset.maxTickets);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (awards.length === 0) {
      setError("Add at least one award.");
      return;
    }
    if (awards.some((a) => !a.name.trim())) {
      setError("Every award needs a name.");
      return;
    }
    const cappedTickets = Math.min(200, Math.max(1, Number(maxTickets) || 0));

    setCreating(true);
    try {
      const config = {
        awards: awards.map(({ id, name, type, maxWinners, points }) => ({
          id,
          name: name.trim(),
          type: resolveAwardType({ type, name }),
          maxWinners: Math.max(1, Number(maxWinners) || 1),
          points: Math.max(0, Number(points) || 0),
        })),
        maxTickets: cappedTickets,
      };

      if (saveAsPreset && presetName.trim()) {
        await savePreset(user.uid, presetName.trim(), config);
      }

      const roomId = await createGame(user.uid, config);
      navigate(`/host/${roomId}/lobby`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong creating the room. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-10 sm:py-14 flex justify-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ink)]/40 mb-1">
              Setting up as
            </p>
            <p className="font-medium">{user?.displayName}</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-[var(--ink)]/50 underline underline-offset-4"
          >
            Sign out
          </button>
        </div>

        <h1 className="font-display text-3xl mb-6">Set up your game</h1>

        {presets.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm text-[var(--ink)]/60 mb-2">
              Start from a saved preset
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full py-3 px-3 bg-white border-2 border-[var(--ink)]/20 rounded-sm"
            >
              <option value="">— none —</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Awards</h2>
              <button
                type="button"
                onClick={addAward}
                className="text-sm text-[var(--teal-deep)] font-medium underline underline-offset-4"
              >
                + Add award
              </button>
            </div>

            <div className="space-y-3">
              {awards.map((award) => (
                <div
                  key={award.id}
                  className="bg-white border-2 border-[var(--ink)]/15 rounded-sm p-3"
                >
                  <div className="flex gap-2 mb-2">
                    <input
                      value={award.name}
                      onChange={(e) =>
                        updateAward(award.id, "name", e.target.value)
                      }
                      placeholder="Award name"
                      className="flex-1 min-w-0 py-2 px-2 border border-[var(--ink)]/20 rounded-sm text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeAward(award.id)}
                      className="text-[var(--amber-deep)] text-sm px-2"
                      aria-label={`Remove ${award.name}`}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <label className="flex items-center gap-2 flex-1">
                      <span className="text-[var(--ink)]/50 whitespace-nowrap">
                        Winners
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={award.maxWinners}
                        onChange={(e) =>
                          updateAward(award.id, "maxWinners", e.target.value)
                        }
                        className="w-full py-2 px-2 border border-[var(--ink)]/20 rounded-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 flex-1">
                      <span className="text-[var(--ink)]/50 whitespace-nowrap">
                        Points
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={award.points}
                        onChange={(e) =>
                          updateAward(award.id, "points", e.target.value)
                        }
                        className="w-full py-2 px-2 border border-[var(--ink)]/20 rounded-sm"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Tickets</h2>
            <label className="block text-sm text-[var(--ink)]/60 mb-2">
              Maximum tickets for this game (up to 200)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={maxTickets}
              onChange={(e) => setMaxTickets(e.target.value)}
              className="w-full py-3 px-3 bg-white border-2 border-[var(--ink)]/20 rounded-sm"
            />
          </section>

          <section className="bg-white border-2 border-[var(--ink)]/15 rounded-sm p-3">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={saveAsPreset}
                onChange={(e) => setSaveAsPreset(e.target.checked)}
                className="w-4 h-4 accent-[var(--teal)]"
              />
              <span className="text-sm">Save this setup as a preset</span>
            </label>
            {saveAsPreset && (
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="w-full py-2 px-2 border border-[var(--ink)]/20 rounded-sm text-sm"
              />
            )}
          </section>

          {error && (
            <p className="text-sm text-[var(--amber-deep)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full py-4 bg-[var(--teal)] text-white font-medium rounded-sm border-2 border-[var(--teal-deep)] shadow-[4px_4px_0_var(--teal-deep)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60"
          >
            {creating ? "Creating room…" : "Create room"}
          </button>
        </form>
      </div>
    </div>
  );
}
