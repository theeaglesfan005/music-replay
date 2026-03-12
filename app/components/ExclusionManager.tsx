"use client";

import { useState, useEffect } from "react";
import { EyeOff, X, Plus, Trash2 } from "lucide-react";
import { Exclusions, fetchExclusions, addExclusion, removeExclusion } from "../lib/api";

interface ExclusionManagerProps {
  onExclusionsChange: () => void;
}

export default function ExclusionManager({ onExclusionsChange }: ExclusionManagerProps) {
  const [exclusions, setExclusions] = useState<Exclusions>({ albums: [], artists: [], tracks: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [addType, setAddType] = useState<"album" | "artist" | "track">("album");
  const [addValue, setAddValue] = useState("");
  const [addArtist, setAddArtist] = useState("");

  useEffect(() => {
    fetchExclusions().then(setExclusions).catch(() => {});
  }, []);

  const totalExclusions = exclusions.albums.length + exclusions.artists.length + exclusions.tracks.length;

  const handleAdd = async () => {
    if (!addValue.trim()) return;
    if (addType === "album" && !addArtist.trim()) return;
    try {
      const updated = await addExclusion(addType, addValue.trim(), addType === "album" ? addArtist.trim() : undefined);
      setExclusions(updated);
      setAddValue("");
      setAddArtist("");
      onExclusionsChange();
    } catch {}
  };

  const handleRemove = async (type: "album" | "artist" | "track", value: string, artist?: string) => {
    try {
      const updated = await removeExclusion(type, value, type === "album" ? artist : undefined);
      setExclusions(updated);
      onExclusionsChange();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          totalExclusions > 0
            ? "bg-amber-500/15 text-amber-400"
            : "border border-card-border text-muted hover:bg-white/5"
        }`}
      >
        <EyeOff size={14} />
        Exclusions{totalExclusions > 0 ? ` (${totalExclusions})` : ""}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border border-card-border bg-card-bg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Manage Exclusions</h3>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <p className="mb-4 text-xs text-muted">
            Excluded items are removed from all stats calculations. Your actual Music library is never modified.
          </p>

          {/* Add new exclusion */}
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as "album" | "artist" | "track")}
              className="rounded-lg border border-card-border bg-black px-3 py-1.5 text-sm text-foreground outline-none"
            >
              <option value="album">Album</option>
              <option value="artist">Artist</option>
              <option value="track">Track</option>
            </select>
            <input
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter ${addType} name to exclude...`}
              className="min-w-0 flex-1 rounded-lg border border-card-border bg-black px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent"
            />
            {addType === "album" && (
              <input
                type="text"
                value={addArtist}
                onChange={(e) => setAddArtist(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Artist name..."
                className="min-w-0 flex-1 rounded-lg border border-card-border bg-black px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent"
              />
            )}
            <button
              onClick={handleAdd}
              disabled={!addValue.trim()}
              className="flex items-center gap-1 rounded-lg gradient-bg px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Current exclusions */}
          {totalExclusions === 0 ? (
            <p className="text-sm text-muted">No exclusions set.</p>
          ) : (
            <div className="space-y-3">
              {exclusions.albums.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Albums</p>
                  <div className="flex flex-wrap gap-2">
                    {exclusions.albums.map((entry) => (
                      <span
                        key={`${entry.album}-${entry.artist}`}
                        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
                      >
                        {entry.album} <span className="text-amber-400/60">by</span> {entry.artist}
                        <button
                          onClick={() => handleRemove("album", entry.album, entry.artist)}
                          className="hover:text-amber-200"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exclusions.artists.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Artists</p>
                  <div className="flex flex-wrap gap-2">
                    {exclusions.artists.map((artist) => (
                      <span
                        key={artist}
                        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
                      >
                        {artist}
                        <button
                          onClick={() => handleRemove("artist", artist)}
                          className="hover:text-amber-200"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exclusions.tracks.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Tracks</p>
                  <div className="flex flex-wrap gap-2">
                    {exclusions.tracks.map((track) => (
                      <span
                        key={track}
                        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
                      >
                        {track}
                        <button
                          onClick={() => handleRemove("track", track)}
                          className="hover:text-amber-200"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
