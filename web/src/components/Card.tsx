import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, style, pad = 20, hover = false, onClick, className = "" }: CardProps) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={"ink-panel " + className}
      style={{
        padding: pad,
        cursor: onClick ? "pointer" : "default",
        transition: "all .18s ease",
        transform: hover && h ? "translateY(-2px)" : "none",
        borderColor: hover && h ? "var(--ink3)" : "var(--ink-line)",
        boxShadow: hover && h ? "var(--shadow-2)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface SectionTitleProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}

export function SectionTitle({ eyebrow, title, sub, right, style }: SectionTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
        ...style,
      }}
    >
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 7 }}>{eyebrow}</div>}
        {title && (
          <div
            className="serif"
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "var(--txt)",
              lineHeight: 1.15,
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        )}
        {sub && (
          <div
            style={{
              fontSize: 13.5,
              color: "var(--txt-mute)",
              marginTop: 7,
              maxWidth: 620,
              lineHeight: 1.5,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  value,
  label,
  color = "var(--txt)",
  sub,
}: {
  value: ReactNode;
  label: ReactNode;
  color?: string;
  sub?: ReactNode;
}) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 30, fontWeight: 600, color, lineHeight: 1 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--txt-faint)",
          textTransform: "uppercase",
          letterSpacing: ".14em",
          marginTop: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--txt-mute)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export function TallyBar({
  support,
  oppose,
  abstain,
  height = 8,
}: {
  support: number;
  oppose: number;
  abstain: number;
  height?: number;
}) {
  const total = support + oppose + abstain || 1;
  return (
    <div
      style={{
        display: "flex",
        height,
        borderRadius: 999,
        overflow: "hidden",
        background: "var(--ink)",
      }}
    >
      <div style={{ width: `${(support / total) * 100}%`, background: "var(--support)" }} />
      <div style={{ width: `${(abstain / total) * 100}%`, background: "var(--abstain)" }} />
      <div style={{ width: `${(oppose / total) * 100}%`, background: "var(--oppose)" }} />
    </div>
  );
}
