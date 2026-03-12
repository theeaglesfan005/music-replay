"use client";

import { formatNumber } from "../lib/api";

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
}

export default function StatCard({ label, value, sublabel, icon, gradient }: StatCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  return (
    <div className="stat-card rounded-2xl border border-card-border bg-card-bg p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${gradient ? "gradient-text" : ""}`}>
            {displayValue}
          </p>
          {sublabel && <p className="mt-1 text-sm text-muted">{sublabel}</p>}
        </div>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
    </div>
  );
}
