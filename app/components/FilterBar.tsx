"use client";

import { useState } from "react";
import { Calendar, X, ChevronDown, ChevronUp } from "lucide-react";
import { StatsFilter } from "../lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface FilterBarProps {
  availableYears: number[];
  filter: StatsFilter;
  onFilterChange: (filter: StatsFilter) => void;
}

export default function FilterBar({ availableYears, filter, onFilterChange }: FilterBarProps) {
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateFrom, setDateFrom] = useState(filter.dateFrom || "");
  const [dateTo, setDateTo] = useState(filter.dateTo || "");

  const isAllTime = !filter.year && !filter.dateFrom && !filter.dateTo;
  const isCustomRange = !!(filter.dateFrom || filter.dateTo);

  const handleYearClick = (year: number) => {
    if (filter.year === year && !filter.month) {
      onFilterChange({});
    } else {
      onFilterChange({ year });
    }
    setShowDateRange(false);
  };

  const handleMonthClick = (month: number) => {
    if (filter.month === month) {
      onFilterChange({ year: filter.year });
    } else {
      onFilterChange({ year: filter.year, month });
    }
  };

  const handleDayClick = (day: number) => {
    if (filter.day === day) {
      onFilterChange({ year: filter.year, month: filter.month });
    } else {
      onFilterChange({ year: filter.year, month: filter.month, day });
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleAllTime = () => {
    onFilterChange({});
    setShowDateRange(false);
    setDateFrom("");
    setDateTo("");
  };

  const handleApplyDateRange = () => {
    if (dateFrom || dateTo) {
      onFilterChange({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    }
  };

  const handleClearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    onFilterChange({});
    setShowDateRange(false);
  };

  return (
    <div className="space-y-3">
      {/* Year chips + controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAllTime}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isAllTime
              ? "gradient-bg text-white"
              : "border border-card-border text-muted hover:bg-white/5 hover:text-foreground"
          }`}
        >
          All Time
        </button>

        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => handleYearClick(year)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter.year === year && !isCustomRange
                ? "gradient-bg text-white"
                : "border border-card-border text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {year}
          </button>
        ))}

        <button
          onClick={() => setShowDateRange(!showDateRange)}
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isCustomRange
              ? "gradient-bg text-white"
              : "border border-card-border text-muted hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <Calendar size={14} />
          {isCustomRange ? "Custom Range" : "Date Range"}
          {showDateRange ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Month chips (shown when a year is selected) */}
      {filter.year && !isCustomRange && (
        <div className="flex flex-wrap gap-2">
          {MONTHS.map((name, i) => {
            const now = new Date();
            if (filter.year === now.getFullYear() && i + 1 > now.getMonth() + 1) return null;
            return (
              <button
                key={name}
                onClick={() => handleMonthClick(i + 1)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter.month === i + 1
                    ? "bg-accent/20 text-accent"
                    : "border border-card-border/50 text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      {/* Day chips (shown when a month is selected) */}
      {filter.year && filter.month && !isCustomRange && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: getDaysInMonth(filter.year, filter.month) }, (_, i) => {
            const day = i + 1;
            const now = new Date();
            if (filter.year === now.getFullYear() && filter.month === now.getMonth() + 1 && day > now.getDate()) return null;
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`min-w-[32px] rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  filter.day === day
                    ? "bg-accent/20 text-accent"
                    : "border border-card-border/50 text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}

      {/* Date range picker */}
      {showDateRange && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-card-border bg-card-bg p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-card-border bg-black px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-card-border bg-black px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleApplyDateRange}
            disabled={!dateFrom && !dateTo}
            className="rounded-lg gradient-bg px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
          {isCustomRange && (
            <button
              onClick={handleClearDateRange}
              className="flex items-center gap-1 rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-white/5"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Active filter indicator */}
      {!isAllTime && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Filtering by last played date:</span>
          <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent">
            {isCustomRange
              ? `${dateFrom || "..."} → ${dateTo || "..."}`
              : filter.day
              ? `${MONTHS[filter.month! - 1]} ${filter.day}, ${filter.year}`
              : filter.month
              ? `${MONTHS[filter.month - 1]} ${filter.year}`
              : `${filter.year}`}
          </span>
          <button onClick={handleAllTime} className="text-muted hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
