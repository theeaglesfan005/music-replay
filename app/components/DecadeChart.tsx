"use client";

import { formatNumber } from "../lib/api";
import { DecadeEntry } from "../lib/api";

interface DecadeChartProps {
  decades: DecadeEntry[];
}

export default function DecadeChart({ decades }: DecadeChartProps) {
  const sorted = [...decades].sort((a, b) => {
    const aYear = parseInt(a.decade);
    const bYear = parseInt(b.decade);
    return aYear - bYear;
  });
  const maxPlays = sorted.length > 0 ? Math.max(...sorted.map((d) => d.playCount)) : 1;

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-6">
      <h3 className="mb-4 text-xl font-bold">Decades</h3>
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {sorted.map((decade) => {
          const pct = (decade.playCount / maxPlays) * 100;
          return (
            <div key={decade.decade} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted tabular-nums">{formatNumber(decade.playCount)}</span>
              <div className="w-full flex items-end" style={{ height: 140 }}>
                <div
                  className="w-full rounded-t-md gradient-bg opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted">{decade.decade}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
