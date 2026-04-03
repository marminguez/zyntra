"use client";

import type { ZyntraOutput } from "@/server/zyntra/types";

const STATUS_CONFIG = {
  stable: {
    label: "Stable",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    dot: "bg-teal-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  unstable: {
    label: "Unstable",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    ),
  },
  deteriorating: {
    label: "Needs Attention",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
  },
};

const TREND_LABEL: Record<ZyntraOutput["trend"], string> = {
  improving: "↑ Improving",
  worsening: "↓ Worsening",
  neutral: "→ Neutral",
};

const TREND_COLOR: Record<ZyntraOutput["trend"], string> = {
  improving: "text-teal-600",
  worsening: "text-rose-600",
  neutral: "text-slate-500",
};

interface ZyntraStatusCardProps {
  output: ZyntraOutput;
  loading?: boolean;
  onTalkToZyntra: () => void;
}

export function ZyntraStatusCard({
  output,
  loading,
  onTalkToZyntra,
}: ZyntraStatusCardProps) {
  const cfg = STATUS_CONFIG[output.status];

  return (
    <div
      id="zyntra-status-card"
      className={`mb-6 rounded-[1.5rem] border p-5 shadow-sm ${cfg.bg} ${cfg.border}`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>
            Zyntra Intelligence
          </span>
        </div>
        <span
          className={`text-xs font-semibold ${TREND_COLOR[output.trend]}`}
        >
          {TREND_LABEL[output.trend]}
        </span>
      </div>

      {/* Score + Status */}
      <div className="flex items-end gap-4 mb-3">
        <div>
          <span className="text-5xl font-serif font-bold tracking-tighter text-slate-900 leading-none">
            {output.riskScore}
          </span>
          <span className="text-slate-400 text-sm ml-1">/100</span>
        </div>
        <div
          className={`mb-1 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.color} ${cfg.bg} ${cfg.border}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {cfg.icon}
          </svg>
          {cfg.label}
        </div>
      </div>

      {/* Insight text */}
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        {output.explanation.length > 120
          ? output.explanation.slice(0, 120) + "…"
          : output.explanation}
      </p>

      {/* CTA */}
      <button
        id="zyntra-talk-btn"
        onClick={onTalkToZyntra}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-zyntra-navy text-white text-sm font-semibold shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        Talk to Zyntra
      </button>
    </div>
  );
}
