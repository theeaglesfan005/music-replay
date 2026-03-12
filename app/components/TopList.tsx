"use client";

import { useState } from "react";
import { EyeOff, Music, User, Disc3 } from "lucide-react";
import { formatNumber, formatDuration } from "../lib/api";

interface TopListItem {
  rank: number;
  title: string;
  subtitle: string;
  playCount: number;
  totalListeningTime?: number;
  extra?: string;
  loved?: boolean;
  albumName?: string;
  artistName?: string;
  artworkUrl?: string;
}

interface TopListProps {
  title: string;
  items: TopListItem[];
  showAll?: boolean;
  onToggleShowAll?: () => void;
  onExcludeAlbum?: (albumName: string, artistName: string) => void;
  artworkShape?: "square" | "circle";
  headerRight?: React.ReactNode;
}

function ArtworkImage({ src, shape, fallbackIcon }: { src?: string; shape: "square" | "circle"; fallbackIcon: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const rounding = shape === "circle" ? "rounded-full" : "rounded-md";

  if (!src || failed) {
    return (
      <div className={`h-8 w-8 md:h-10 md:w-10 xl:h-12 xl:w-12 shrink-0 ${rounding} bg-white/5 flex items-center justify-center text-muted`}>
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`h-8 w-8 md:h-10 md:w-10 xl:h-12 xl:w-12 shrink-0 ${rounding} object-cover bg-white/5`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export default function TopList({ title, items, showAll, onToggleShowAll, onExcludeAlbum, artworkShape = "square", headerRight }: TopListProps) {
  const displayed = showAll ? items : items.slice(0, 10);

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-bold">{title}</h3>
        {headerRight}
      </div>
      <div className="space-y-1">
        {displayed.map((item) => (
          <div
            key={`${item.rank}-${item.title}`}
            className="group flex items-center gap-2 md:gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
          >
            <span className="w-6 text-right text-[11px] md:text-xs font-bold text-muted tabular-nums">
              {item.rank}
            </span>
            {item.artworkUrl !== undefined && (
              <ArtworkImage
                src={item.artworkUrl}
                shape={artworkShape}
                fallbackIcon={artworkShape === "circle" ? <User size={14} /> : item.albumName ? <Disc3 size={14} /> : <Music size={14} />}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-semibold leading-tight wrap-break-word">
                {item.title}{item.loved && <span className="text-accent text-xs ml-1">♥</span>}
              </p>
              <p className="text-[10px] md:text-xs leading-tight text-muted wrap-break-word">
                {item.albumName && item.subtitle.includes(`· ${item.albumName}`) ? (
                  <>
                    {item.subtitle.split(`· ${item.albumName}`)[0]}
                    <span className="font-semibold text-foreground/70">· {item.albumName}</span>
                    {item.subtitle.split(`· ${item.albumName}`).slice(1).join(`· ${item.albumName}`)}
                  </>
                ) : (
                  item.subtitle
                )}
              </p>
            </div>
            {onExcludeAlbum && item.albumName && item.artistName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExcludeAlbum(item.albumName!, item.artistName!);
                }}
                title={`Exclude album: ${item.albumName} by ${item.artistName}`}
                className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-amber-500/10 hover:text-amber-400 group-hover:opacity-100"
              >
                <EyeOff size={14} />
              </button>
            )}
            <div className="text-right shrink-0">
              <p className="text-[11px] md:text-sm font-semibold tabular-nums">
                {formatNumber(item.playCount)} <span className="text-muted font-normal">plays</span>
              </p>
              {item.totalListeningTime !== undefined && item.totalListeningTime > 0 && (
                <p className="text-[10px] md:text-xs text-muted tabular-nums">
                  {formatDuration(item.totalListeningTime)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length > 10 && onToggleShowAll && (
        <button
          onClick={onToggleShowAll}
          className="mt-4 w-full rounded-xl py-2 text-sm font-medium text-accent hover:bg-white/5 transition-colors"
        >
          {showAll ? "Show Less" : `Show All ${items.length}`}
        </button>
      )}
    </div>
  );
}
