import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { Wordmark } from "./Seal";

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

export const NAV: NavItem[] = [
  { route: "dashboard", icon: "dashboard", label: "The Floor" },
  { route: "launch", icon: "launch", label: "Launch Debate" },
  { route: "personas", icon: "personas", label: "Persona Manager" },
  { route: "parties", icon: "flag", label: "Party Manager" },
  { route: "graph", icon: "graph", label: "Relationship Graph" },
];

export function Sidebar({
  route,
  nav,
  model,
}: {
  route: string;
  nav: (route: string, param?: string) => void;
  model?: string;
}) {
  return (
    <div
      style={{
        width: 230,
        flexShrink: 0,
        background: "var(--ink1)",
        borderRight: "1px solid var(--ink-line)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
      }}
    >
      <div
        onClick={() => nav("dashboard")}
        style={{ cursor: "pointer", padding: "4px 8px 22px" }}
      >
        <Wordmark />
      </div>
      <div className="gold-rule" style={{ marginBottom: 18, padding: "0 4px" }} />
      <nav style={{ display: "grid", gap: 5 }}>
        {NAV.map((n) => {
          const active = route === n.route;
          return (
            <button
              key={n.route}
              onClick={() => nav(n.route)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 13px",
                borderRadius: "var(--r-md)",
                textAlign: "left",
                background: active ? "var(--ink3)" : "transparent",
                color: active ? "var(--txt)" : "var(--txt-mute)",
                border: `1px solid ${active ? "var(--ink-line)" : "transparent"}`,
                transition: "all .15s ease",
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--ink2)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span style={{ color: active ? "var(--gold-bright)" : "var(--txt-faint)" }}>
                <Icon name={n.icon} size={18} />
              </span>
              {n.label}
              {active && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--gold)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
        <div className="gold-rule" style={{ marginBottom: 6, padding: "0 4px" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "12px 13px",
            marginTop: 6,
            borderRadius: "var(--r-md)",
            background: "var(--ink2)",
            border: "1px solid var(--ink-line)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--support)",
              boxShadow: "0 0 8px var(--support)",
            }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11.5, color: "var(--txt)", fontWeight: 600 }}>
              Engine online
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--txt-faint)" }}>
              {model || "claude-opus-4.5"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const navMini: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 13px",
  borderRadius: "var(--r-md)",
  color: "var(--txt-faint)",
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
};
