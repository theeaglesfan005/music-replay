"use client";

import { formatNumber } from "../lib/api";
import { TopGenre } from "../lib/api";

interface GenreChartProps {
  genres: TopGenre[];
}

export default function GenreChart({ genres }: GenreChartProps) {
  const top = genres.slice(0, 10);
  const maxPlays = top.length > 0 ? top[0].playCount : 1;

  const colors = [
    "#fa2d48", "#fc6e51", "#fd9426", "#ffd60a", "#30d158",
    "#64d2ff", "#5e5ce6", "#bf5af2", "#ff375f", "#ff6482",
  ];

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-6">
      <h3 className="mb-4 text-xl font-bold">Top Genres</h3>
      <div className="space-y-3">
        {top.map((genre, i) => {
          const pct = (genre.playCount / maxPlays) * 100;
          return (
            <div key={genre.genre} className="group">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{genre.genre}</span>
                <span className="text-muted tabular-nums">{formatNumber(genre.playCount)} plays</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
