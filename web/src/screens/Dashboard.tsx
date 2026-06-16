import { useEffect, useState } from "react";
import { api } from "../api";
import { Btn } from "../components/Btn";
import { Card, SectionTitle, Stat, TallyBar } from "../components/Card";
import { Icon } from "../components/Icon";
import { Seal } from "../components/Seal";
import { StatusTag } from "../components/Tags";
import type { DebateSummary } from "../types";

interface DashboardProps {
  nav: (route: string, param?: string) => void;
}

const PLACEHOLDER_DEBATES: DebateSummary[] = [];

export function Dashboard({ nav }: DashboardProps) {
  // M1 has no /api/debates endpoint yet — placeholder until M3.
  const [debates, setDebates] = useState<DebateSummary[]>(PLACEHOLDER_DEBATES);
  const [stats, setStats] = useState({ democrat: 0, republican: 0 });

  useEffect(() => {
    void api.listParties().then((r) => {
      const map: Record<string, number> = {};
      r.parties.forEach((p) => {
        map[p.id] = p.seats;
      });
      setStats({ democrat: map.democrat || 0, republican: map.republican || 0 });
    });
  }, []);

  const passed = debates.filter((d) => d.status === "passed").length;
  const passRate = debates.length ? Math.round((passed / debates.length) * 100) : 0;
  const totalSeats = stats.democrat + stats.republican;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 40px 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 30 }}>
        <div className="ink-panel" style={{ padding: "34px 36px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, opacity: 0.06 }}>
            <Seal size={260} />
          </div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            The Floor · Session 2026
          </div>
          <h1
            className="serif"
            style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.08, margin: "0 0 14px", maxWidth: 520 }}
          >
            Simulate the outcome of any proposal before it reaches the floor.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--txt-mute)",
              lineHeight: 1.6,
              maxWidth: 540,
              margin: "0 0 24px",
            }}
          >
            Twenty-two agentic AI personas — eleven per party — deliberate, debate across the aisle,
            and vote. Watch positions form, amendments emerge, and minds change in real time.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Btn kind="primary" icon="launch" size="lg" onClick={() => nav("launch")}>
              Convene a Debate
            </Btn>
            <Btn kind="ghost" icon="personas" size="lg" onClick={() => nav("personas")}>
              Manage the Floor
            </Btn>
          </div>
        </div>

        <div className="ink-panel" style={{ padding: "26px 28px", display: "flex", flexDirection: "column" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Chamber Composition
          </div>
          <ChamberMini />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: 20,
            }}
          >
            <div>
              <div className="serif" style={{ fontSize: 26, color: "var(--dem-bright)", fontWeight: 600 }}>
                {stats.democrat}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--txt-faint)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Democrat
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="serif" style={{ fontSize: 26, color: "var(--gold-bright)", fontWeight: 600 }}>
                {totalSeats}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--txt-faint)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Seated
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="serif" style={{ fontSize: 26, color: "var(--rep-bright)", fontWeight: 600 }}>
                {stats.republican}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--txt-faint)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Republican
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="ink-panel"
        style={{
          padding: "24px 32px",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 24,
          marginBottom: 34,
        }}
      >
        <Stat value={debates.length} label="Debates Held" />
        <Stat value={`${passRate}%`} label="Passage Rate" color="var(--pass)" />
        <Stat value={debates.length ? "—" : "—"} label="Amendments Tabled" color="var(--gold-bright)" />
        <Stat value="—" label="Votes Flipped" color="var(--dem-bright)" sub="via persuasion" />
      </div>

      <SectionTitle
        eyebrow="Legislative Record"
        title="Recent Deliberations"
        right={
          <Btn kind="ghost" iconR="arrowR" onClick={() => nav("launch")}>
            New debate
          </Btn>
        }
      />

      {debates.length === 0 ? (
        <Card pad={42} style={{ textAlign: "center", color: "var(--txt-mute)" }}>
          <Icon name="transcript" size={28} style={{ color: "var(--ink-line)", marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>
            No debates yet. Convene the first one to start the record.
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn kind="primary" icon="launch" onClick={() => nav("launch")}>
              Convene a Debate
            </Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {debates.map((d) => (
            <Card
              key={d.id}
              hover
              onClick={() => nav("results", d.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 240px 150px",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                  <StatusTag status={d.status} />
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--txt-faint)" }}>
                    {d.rounds} round{d.rounds > 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.title}
                </div>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--support)" }}>{d.support} For</span>
                  {d.abstain > 0 && (
                    <span style={{ color: "var(--abstain)" }}>{d.abstain} Abs</span>
                  )}
                  <span style={{ color: "var(--oppose)" }}>{d.oppose} Against</span>
                </div>
                <TallyBar support={d.support} oppose={d.oppose} abstain={d.abstain} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--txt-faint)" }}>
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                    marginTop: 8,
                    color: "var(--gold)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Open</span>
                  <Icon name="arrowR" size={15} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ChamberMini() {
  const seats: { x: number; y: number; party: "democrat" | "republican"; mid: boolean }[] = [];
  const rows = [
    { r: 46, n: 5 },
    { r: 62, n: 7 },
    { r: 78, n: 9 },
  ];
  rows.forEach((row) => {
    for (let i = 0; i < row.n; i++) {
      const frac = row.n === 1 ? 0.5 : i / (row.n - 1);
      const ang = Math.PI * (1 - frac);
      const cx = 100;
      const cy = 92;
      const x = cx + Math.cos(ang) * row.r;
      const y = cy - Math.sin(ang) * row.r;
      const isDem = frac < 0.5;
      seats.push({
        x,
        y,
        party: isDem ? "democrat" : "republican",
        mid: Math.abs(frac - 0.5) < 0.04,
      });
    }
  });
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "auto" }}>
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.mid ? 2.4 : 3.4}
          fill={
            s.mid ? "var(--gold)" : s.party === "democrat" ? "var(--dem)" : "var(--rep)"
          }
          opacity={s.mid ? 1 : 0.85}
        />
      ))}
      <path
        d="M100 92 m-9 0 a9 9 0 0 1 18 0"
        fill="none"
        stroke="var(--gold-deep)"
        strokeWidth="1"
      />
    </svg>
  );
}
