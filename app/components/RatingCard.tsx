"use client";

import { Star } from "lucide-react";
import { RatingStats, formatNumber } from "../lib/api";

interface RatingCardProps {
  ratings: RatingStats;
}

function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= count ? "" : "text-white/10"}
          style={i <= count ? { color: "#FF0436" } : undefined}
          fill={i <= count ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function RatingCard({ ratings }: RatingCardProps) {
  const breakdown = ratings.breakdown;
  const maxCount = Math.max(
    breakdown["5"], breakdown["4"], breakdown["3"],
    breakdown["2"], breakdown["1"]
  );

  const rows: { stars: number; count: number }[] = [
    { stars: 5, count: breakdown["5"] },
    { stars: 4, count: breakdown["4"] },
    { stars: 3, count: breakdown["3"] },
    { stars: 2, count: breakdown["2"] },
    { stars: 1, count: breakdown["1"] },
  ];

  return (
    <div className="stat-card rounded-2xl border border-card-border bg-card-bg p-6">
      {/* Average rating header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Average Rating</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight" style={{ color: "#FF0436" }}>
              {ratings.averageRating.toFixed(2)}
            </span>
            <Stars count={Math.round(ratings.averageRating)} size={16} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            from {formatNumber(ratings.ratedCount)} rated tracks
          </p>
        </div>
        <Star size={24} style={{ color: "#FF0436" }} fill="currentColor" />
      </div>

      {/* Star breakdown */}
      <div className="space-y-2">
        {rows.map(({ stars, count }) => {
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={stars} className="flex items-center gap-2">
              <Stars count={stars} size={11} />
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ backgroundColor: "rgba(255, 4, 54, 0.7)", width: `${Math.max(pct, 1)}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs tabular-nums text-muted">
                {formatNumber(count)}
              </span>
            </div>
          );
        })}

        {/* Unrated row */}
        <div className="mt-1 flex items-center gap-2 border-t border-card-border pt-2">
          <span className="text-xs text-muted" style={{ width: 82 }}>Not rated</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/20 transition-all duration-500"
              style={{ width: `${maxCount > 0 ? Math.max((breakdown["0"] / maxCount) * 100, 1) : 0}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums text-muted">
            {formatNumber(breakdown["0"])}
          </span>
        </div>
      </div>
    </div>
  );
}
