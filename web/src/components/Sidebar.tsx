import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "../api";
import type { HealthSnapshot } from "../api";
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
  { route: "settings", icon: "settings", label: "Settings" },
];

export function Sidebar({
  route,
  nav,
}: {
  route: string;
  nav: (route: string, param?: string) => void;
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
        <HealthBadge />
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

/** Polled health badge — green when ok, amber when api key missing, red when
 * the backend can't be reached. Click to peek the full payload. */
function HealthBadge() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [reachable, setReachable] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const h = await api.health();
        if (!cancelled) {
          setSnapshot(h);
          setReachable(true);
        }
      } catch {
        if (!cancelled) setReachable(false);
      }
    };
    void poll();
    const t = window.setInterval(poll, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  // Close on click outside.
  useEffect(() => {
    if (!expanded) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [expanded]);

  let state: "online" | "misconfigured" | "offline";
  if (!reachable) state = "offline";
  else if (snapshot && !snapshot.api_key_set) state = "misconfigured";
  else state = "online";

  const dotColor =
    state === "online"
      ? "var(--support)"
      : state === "misconfigured"
        ? "var(--gold-bright)"
        : "var(--reject)";
  const label =
    state === "online"
      ? "Engine online"
      : state === "misconfigured"
        ? "Engine misconfigured"
        : "Engine offline";
  const sub =
    state === "online"
      ? snapshot?.default_model
      : state === "misconfigured"
        ? "Missing API key"
        : "Backend unreachable";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "12px 13px",
          marginTop: 6,
          borderRadius: "var(--r-md)",
          background: "var(--ink2)",
          border: "1px solid var(--ink-line)",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            animation: state === "offline" ? "blink 1.4s step-end infinite" : "none",
            flexShrink: 0,
          }}
        />
        <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: "var(--txt)", fontWeight: 600 }}>{label}</div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--txt-faint)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sub || "—"}
          </div>
        </div>
        <Icon
          name={expanded ? "chevD" : "chevR"}
          size={12}
          style={{ color: "var(--txt-faint)" }}
        />
      </button>
      {expanded && snapshot && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--ink2)",
            border: "1px solid var(--ink-line)",
            borderRadius: "var(--r-md)",
            padding: "12px 14px",
            display: "grid",
            gap: 8,
            fontSize: 11,
            color: "var(--txt-mute)",
            boxShadow: "var(--shadow-2)",
            zIndex: 30,
          }}
        >
          <HealthRow k="Status" v={snapshot.status} />
          <HealthRow k="API key" v={snapshot.api_key_set ? "set" : "missing"} />
          <HealthRow k="Default model" v={snapshot.default_model} />
          <HealthRow
            k="Active debates"
            v={`${snapshot.active_debates} of ${snapshot.total_debates}`}
          />
          <HealthRow k="Uptime" v={fmtUptime(snapshot.uptime_s)} />
          <HealthRow k="Version" v={snapshot.version} />
        </div>
      )}
    </div>
  );
}

function HealthRow({ k, v }: { k: string; v: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ color: "var(--txt-faint)" }}>{k}</span>
      <span className="mono" style={{ color: "var(--txt)", fontWeight: 600, fontSize: 11 }}>
        {v}
      </span>
    </div>
  );
}

function fmtUptime(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
