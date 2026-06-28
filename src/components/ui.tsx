import { useMemo } from "react";
import { ChevronDown } from "lucide-react";

export function StatPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>
        {tone === "green" ? <i className="status-dot" /> : null}
        {value}
      </strong>
    </div>
  );
}

export function Sparkline({
  values,
  color = "#1da8ff",
  filled = false,
}: {
  values: number[];
  color?: string;
  filled?: boolean;
}) {
  const points = useMemo(() => {
    const safe = values.length > 1 ? values : [0, 0];
    const max = Math.max(...safe);
    const min = Math.min(...safe);
    return safe
      .map((value, index) => {
        const x = (index / (safe.length - 1)) * 100;
        const y = 56 - ((value - min) / Math.max(max - min, 1)) * 46;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg className="sparkline" viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true">
      {filled ? <polygon points={`0,64 ${points} 100,64`} fill={color} opacity="0.24" /> : null}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PanelHeader({ title, status = "Live", tone }: { title: string; status?: string; tone?: string }) {
  return (
    <div className="panel-header">
      <span>{title}</span>
      <small className={tone ? `tone-${tone}` : ""}>
        {status} <i />
      </small>
    </div>
  );
}

export function PanelTitle({ title }: { title: string }) {
  return (
    <div className="panel-title">
      <span>{title}</span>
      <ChevronDown size={15} />
    </div>
  );
}

export function NetworkMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "network-mark compact" : "network-mark"}>
      <span />
      <i />
    </div>
  );
}

/** The Network Health gauge ring. `value` is 0–100. */
export function Ring({ value, size = 100 }: { value: number; size?: number }) {
  const fraction = Math.max(0, Math.min(100, value)) / 100;
  const lit = fraction * 0.86;
  return (
    <div
      className="ring"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.28,
        background: `radial-gradient(circle at center, #0a1326 0 55%, transparent 56%), conic-gradient(#4bdd57 0 ${lit * 100}%, #d6e145 ${lit * 100}% 86%, rgba(89, 102, 123, 0.35) 86%)`,
      }}
    >
      {Math.round(value)}
      <small>/100</small>
    </div>
  );
}
