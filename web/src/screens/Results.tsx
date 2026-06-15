import { useEffect, useMemo, useState } from "react";
import type { DebateDetail } from "../api";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { Btn } from "../components/Btn";
import { Card } from "../components/Card";
import { TallyBar } from "../components/Card";
import { Icon } from "../components/Icon";
import { Seal } from "../components/Seal";
import { PartyTag, StatusTag, VOTE_META, VoteTag } from "../components/Tags";
import { ROLE_META } from "../meta";
import { partyBright, partyColor, partyLabel } from "../theme";
import type { Amendment, Persona, Turn, VoteRecord } from "../types";
import { ExportModal } from "./ExportModal";

interface ResultsProps {
  nav: (route: string, param?: string) => void;
  param?: string;
}

type Tab = "overview" | "breakdown" | "timeline" | "transcript" | "amendments";

const PHASE_LABEL: Record<string, string> = {
  intro: "Opening Remarks",
  advisor_discussion: "Caucus Analysis",
  assistant_research: "Staff Research",
  synthesis: "Position Synthesis",
  cross_party_debate: "Cross-Party Debate",
};

export function Results({ nav, param }: ResultsProps) {
  const id = param;
  const [debate, setDebate] = useState<DebateDetail | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Initial fetch + auto-refresh while the debate is still running.
  useEffect(() => {
    if (!id) return;
    setError(null);
    let cancelled = false;
    const fetchAll = async (): Promise<DebateDetail | null> => {
      try {
        const [d, t, v, a] = await Promise.all([
          api.getDebate(id),
          api.getTranscript(id),
          api.getVotes(id),
          api.getAmendments(id),
        ]);
        if (cancelled) return null;
        setDebate(d);
        setTurns(t.turns);
        setVotes(v.votes);
        setAmendments(a.amendments);
        return d;
      } catch (e) {
        if (!cancelled) setError(String((e as Error).message || e));
        return null;
      }
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    void fetchAll().then((d) => {
      if (!d) return;
      if (d.status === "running" || d.status === "pending") {
        timer = setInterval(() => {
          void fetchAll().then((next) => {
            if (next && next.status !== "running" && next.status !== "pending" && timer) {
              clearInterval(timer);
              timer = null;
            }
          });
        }, 5000);
      }
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  if (!id) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <Card pad={20}>No debate selected.</Card>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <Card pad={20} style={{ borderLeft: "3px solid var(--reject)" }}>
          <div style={{ color: "var(--reject)" }}>{error}</div>
        </Card>
      </div>
    );
  }
  if (!debate) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <div style={{ color: "var(--txt-faint)", fontSize: 14 }}>Loading results…</div>
      </div>
    );
  }

  const tally = debate.tally;
  const passed = debate.status === "passed";
  const changes = votes.filter((v) => v.changed);

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "breakdown", label: "Vote Breakdown", icon: "results" },
    { id: "timeline", label: "Persuasion Timeline", icon: "refresh", badge: changes.length },
    { id: "transcript", label: "Transcript", icon: "transcript" },
    { id: "amendments", label: "Amendments", icon: "doc", badge: amendments.length },
  ];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 40px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13 }}>
        <button
          onClick={() => nav("dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "var(--txt-mute)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Icon name="chevL" size={16} /> Dashboard
        </button>
      </div>

      <div
        className="ink-panel"
        style={{
          padding: "30px 34px",
          marginBottom: 24,
          borderTop: `3px solid ${passed ? "var(--pass)" : "var(--reject)"}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -30, top: -30, opacity: 0.05 }}>
          <Seal size={220} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <StatusTag status={debate.status} />
              <span className="mono" style={{ fontSize: 12, color: "var(--txt-faint)" }}>
                {new Date(debate.created_at).toLocaleDateString()} · {debate.config.max_rounds} round
                {debate.config.max_rounds > 1 ? "s" : ""} · {debate.config.model}
              </span>
            </div>
            <h1
              className="serif"
              style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px", maxWidth: 640, lineHeight: 1.15 }}
            >
              {debate.title}
            </h1>
            <p style={{ fontSize: 14, color: "var(--txt-mute)", maxWidth: 660, lineHeight: 1.6, margin: 0 }}>
              {debate.proposal}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Btn kind="ghost" icon="play" onClick={() => nav("arena", debate.id)}>
              Replay
            </Btn>
            <Btn kind="primary" icon="download" onClick={() => setExportOpen(true)}>
              Export
            </Btn>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div>
              <span className="serif" style={{ fontSize: 46, fontWeight: 600, color: "var(--support)" }}>
                {tally.support}
              </span>
              <span style={{ fontSize: 13, color: "var(--txt-faint)", marginLeft: 8, letterSpacing: ".1em" }}>
                FOR
              </span>
            </div>
            <span className="serif" style={{ fontSize: 30, color: "var(--txt-faint)" }}>–</span>
            <div>
              <span className="serif" style={{ fontSize: 46, fontWeight: 600, color: "var(--oppose)" }}>
                {tally.oppose}
              </span>
              <span style={{ fontSize: 13, color: "var(--txt-faint)", marginLeft: 8, letterSpacing: ".1em" }}>
                AGAINST
              </span>
            </div>
            {tally.abstain > 0 && (
              <div style={{ marginLeft: 8 }}>
                <span className="serif" style={{ fontSize: 30, fontWeight: 600, color: "var(--abstain)" }}>
                  {tally.abstain}
                </span>
                <span style={{ fontSize: 12, color: "var(--txt-faint)", marginLeft: 6, letterSpacing: ".1em" }}>
                  ABSTAIN
                </span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, maxWidth: 420 }}>
            <TallyBar
              support={tally.support}
              oppose={tally.oppose}
              abstain={tally.abstain}
              height={12}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--ink-line)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? "var(--gold)" : "transparent"}`,
              marginBottom: -1,
              color: tab === t.id ? "var(--txt)" : "var(--txt-faint)",
              fontSize: 13.5,
              fontWeight: 600,
              transition: "all .15s ease",
            }}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "var(--ink3)",
                  color: "var(--gold-bright)",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview debate={debate} turns={turns} votes={votes} amendments={amendments} nav={nav} />
      )}
      {tab === "breakdown" && <Breakdown votes={votes} />}
      {tab === "timeline" && <Timeline changes={changes} />}
      {tab === "transcript" && <FullTranscript turns={turns} debate={debate} nav={nav} />}
      {tab === "amendments" && <Amendments amendments={amendments} />}

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        debateId={debate.id}
        debateTitle={debate.title}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview — at-a-glance live dashboard of the debate's state.
// ---------------------------------------------------------------------------

const PHASE_ORDER: { key: string; label: string; expected: (d: DebateDetail) => number }[] = [
  { key: "intro", label: "Opening Remarks", expected: () => 2 },
  { key: "advisor_discussion", label: "Caucus Analysis", expected: () => 8 },
  { key: "assistant_research", label: "Staff Research", expected: () => 12 },
  { key: "synthesis", label: "Position Synthesis", expected: () => 2 },
  {
    key: "cross_party_debate",
    label: "Cross-Party Debate",
    // Roughly a half-dozen turns per round (party heads + advisors).
    expected: (d) => Math.max(6, d.config.max_rounds * 4),
  },
  { key: "final_voting", label: "Final Vote", expected: () => 22 },
];

function Overview({
  debate,
  turns,
  votes,
  amendments,
  nav,
}: {
  debate: DebateDetail;
  turns: Turn[];
  votes: VoteRecord[];
  amendments: Amendment[];
  nav: ResultsProps["nav"];
}) {
  const isLive = debate.status === "running" || debate.status === "pending";
  const speakerTurns = useMemo(() => turns.filter((t) => t.agent !== "system"), [turns]);
  const turnsByPhase = useMemo(() => {
    const m: Record<string, Turn[]> = {};
    for (const t of speakerTurns) {
      (m[t.phase] = m[t.phase] || []).push(t);
    }
    return m;
  }, [speakerTurns]);

  const totalDelivered = speakerTurns.length;
  const totalExpected =
    PHASE_ORDER.reduce((acc, ph) => acc + ph.expected(debate), 0) - 22; // expected speech turns (excl. votes)
  const currentPhase = (() => {
    // The "active" phase is the one whose count is still below expected.
    for (const ph of PHASE_ORDER) {
      if (ph.key === "final_voting") continue;
      const done = (turnsByPhase[ph.key] || []).length;
      const expected = ph.expected(debate);
      if (done < expected) return ph.key;
    }
    return "final_voting";
  })();
  const currentPhaseLabel =
    PHASE_ORDER.find((p) => p.key === currentPhase)?.label || currentPhase;

  const elapsed = useMemo(() => {
    if (debate.duration_s != null) return debate.duration_s;
    const t0 = new Date(debate.created_at).getTime();
    return Math.max(0, Math.floor((Date.now() - t0) / 1000));
  }, [debate.created_at, debate.duration_s]);

  const persuasionCount = votes.filter((v) => v.changed).length;
  const tally = debate.tally;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* Top stat tiles ------------------------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <StatTile
          label="Current phase"
          value={isLive ? currentPhaseLabel : "Resolved"}
          accent={isLive ? "var(--gold-bright)" : "var(--pass)"}
          icon={isLive ? "clock" : "check"}
        />
        <StatTile
          label="Turns delivered"
          value={`${totalDelivered}`}
          sub={`of ~${totalExpected} expected`}
          icon="transcript"
        />
        <StatTile
          label="Votes cast"
          value={`${votes.length}`}
          sub={`of ${debate.config.parties.length * 11} agents`}
          icon="vote"
          accent={votes.length > 0 ? "var(--gold-bright)" : undefined}
        />
        <StatTile
          label="Runtime"
          value={fmtDuration(elapsed)}
          sub={isLive ? "ticking…" : `model ${debate.config.model}`}
          icon="bolt"
        />
      </div>

      {/* Middle row: phase progress + tally / persuasion ----------------- */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <Card pad={22}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Deliberation progress
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {PHASE_ORDER.map((ph) => {
              const done =
                ph.key === "final_voting" ? votes.length : (turnsByPhase[ph.key] || []).length;
              const expected = ph.expected(debate);
              const active = ph.key === currentPhase && isLive;
              const complete = done >= expected;
              const pct = Math.min(100, Math.round((done / Math.max(1, expected)) * 100));
              return (
                <div key={ph.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        color: active
                          ? "var(--gold-bright)"
                          : complete
                            ? "var(--txt)"
                            : "var(--txt-mute)",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: active
                            ? "var(--gold-bright)"
                            : complete
                              ? "var(--pass)"
                              : "var(--ink-line)",
                          boxShadow: active ? "0 0 8px var(--gold-bright)" : "none",
                          animation: active ? "blink 1.4s step-end infinite" : "none",
                        }}
                      />
                      {ph.label}
                    </span>
                    <span
                      className="mono"
                      style={{ color: "var(--txt-faint)", fontSize: 11.5 }}
                    >
                      {done}/{expected}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background: "var(--ink)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: active
                          ? "linear-gradient(90deg, var(--gold), var(--gold-bright))"
                          : complete
                            ? "var(--pass)"
                            : "var(--ink-line)",
                        transition: "width .3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "grid", gap: 22 }}>
          <Card pad={22}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Live tally
            </div>
            {votes.length === 0 ? (
              <div
                style={{
                  color: "var(--txt-faint)",
                  fontSize: 13,
                  padding: "20px 0",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {isLive ? "Voting hasn't begun." : "No votes recorded."}
                <div style={{ fontSize: 11.5, marginTop: 6 }}>
                  Final tallies appear as the chamber votes.
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 9,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--support)" }}>{tally.support} For</span>
                  <span style={{ color: "var(--abstain)" }}>{tally.abstain} Abstain</span>
                  <span style={{ color: "var(--oppose)" }}>{tally.oppose} Against</span>
                </div>
                <TallyBar
                  support={tally.support}
                  oppose={tally.oppose}
                  abstain={tally.abstain}
                  height={12}
                />
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--txt-mute)",
                  }}
                >
                  <span>Persuasion shifts</span>
                  <span
                    style={{
                      color: persuasionCount > 0 ? "var(--gold-bright)" : "var(--txt-faint)",
                      fontWeight: 600,
                    }}
                  >
                    {persuasionCount} flipped
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card pad={22}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Caucus split
            </div>
            <CaucusBars votes={votes} debate={debate} />
          </Card>
        </div>
      </div>

      {/* Recent activity feed ------------------------------------------- */}
      <Card pad={22}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div className="eyebrow">Recent activity</div>
          {isLive && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                color: "var(--gold-bright)",
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--gold-bright)",
                  animation: "blink 1.4s step-end infinite",
                }}
              />
              Live
            </span>
          )}
        </div>
        {speakerTurns.length === 0 ? (
          <div
            style={{
              color: "var(--txt-faint)",
              fontSize: 13,
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            The chamber hasn't spoken yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {speakerTurns.slice(-5).reverse().map((t) => (
              <RecentTurn key={t.id} t={t} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {isLive && (
            <Btn kind="ghost" iconR="arrowR" onClick={() => nav("arena", debate.id)}>
              Watch in the arena
            </Btn>
          )}
        </div>
      </Card>

      {/* Amendments preview --------------------------------------------- */}
      {amendments.length > 0 && (
        <Card pad={22}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Amendments ({amendments.length})
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {amendments.slice(0, 3).map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "var(--r-md)",
                  background: "var(--ink)",
                  border: "1px solid var(--ink-line)",
                }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--gold-deep)",
                    width: 22,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  style={{
                    flex: 1,
                    fontSize: 13,
                    margin: 0,
                    color: "var(--txt-mute)",
                    lineHeight: 1.5,
                  }}
                >
                  {a.text}
                </p>
                <StatusTag status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon: string;
}) {
  return (
    <Card pad={18}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--txt-faint)",
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".12em",
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={12} style={{ color: "var(--gold)" }} />
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: accent || "var(--txt)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--txt-faint)", marginTop: 6 }}>{sub}</div>
      )}
    </Card>
  );
}

function CaucusBars({ votes, debate }: { votes: VoteRecord[]; debate: DebateDetail }) {
  const parties = debate.config.parties.length > 0 ? debate.config.parties : ["democrat", "republican"];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {parties.map((party) => {
        const list = votes.filter((v) => v.party === party);
        const t = { support: 0, oppose: 0, abstain: 0 };
        list.forEach((v) => t[v.vote]++);
        const seated = 11; // engine ships 11 per ground-truth party
        return (
          <div key={party}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                marginBottom: 6,
              }}
            >
              <span style={{ color: partyBright(party), fontWeight: 600 }}>
                {partyLabel(party)}
              </span>
              <span className="mono" style={{ color: "var(--txt-faint)", fontSize: 11 }}>
                {list.length}/{seated}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                height: 8,
                borderRadius: 999,
                overflow: "hidden",
                background: "var(--ink)",
              }}
            >
              <div
                style={{
                  width: `${(t.support / seated) * 100}%`,
                  background: "var(--support)",
                }}
              />
              <div
                style={{
                  width: `${(t.abstain / seated) * 100}%`,
                  background: "var(--abstain)",
                }}
              />
              <div
                style={{
                  width: `${(t.oppose / seated) * 100}%`,
                  background: "var(--oppose)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentTurn({ t }: { t: Turn }) {
  const [p, setP] = useState<Persona | null>(null);
  useEffect(() => {
    void api.getPersona(t.agent).then(setP).catch(() => null);
  }, [t.agent]);
  if (!p) return null;
  const snippet = t.content.length > 220 ? t.content.slice(0, 220).trim() + "…" : t.content;
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Avatar p={p} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            className="serif"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: partyBright(p.party),
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </span>
          <PartyTag party={p.party} size="sm" />
          <span
            style={{
              fontSize: 11,
              color: "var(--txt-faint)",
              whiteSpace: "nowrap",
            }}
          >
            {PHASE_LABEL[t.phase] || t.phase}
          </span>
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--txt-mute)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {snippet}
        </p>
      </div>
    </div>
  );
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// ---------------------------------------------------------------------------

function Breakdown({ votes }: { votes: VoteRecord[] }) {
  const grouped = votes.reduce<Record<string, VoteRecord[]>>((acc, v) => {
    (acc[v.party] = acc[v.party] || []).push(v);
    return acc;
  }, {});
  const parties = Object.keys(grouped);
  if (!parties.length) {
    return <EmptyState icon="results" text="Votes will appear here once the chamber casts them." />;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(parties.length, 2)}, 1fr)`, gap: 30 }}>
      {parties.map((party) => {
        const list = grouped[party];
        const t = { support: 0, oppose: 0, abstain: 0 };
        list.forEach((v) => t[v.vote]++);
        return (
          <div key={party}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                paddingBottom: 11,
                borderBottom: `2px solid ${partyColor(party)}`,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: partyColor(party),
                }}
              />
              <span className="serif" style={{ fontSize: 17, fontWeight: 600 }}>
                {partyLabel(party)} Caucus
              </span>
              <span
                className="mono"
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: "var(--txt-faint)",
                }}
              >
                {t.support}·{t.abstain}·{t.oppose}
              </span>
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {list.map((v) => (
                <VoteCard key={v.agent} v={v} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VoteCard({ v }: { v: VoteRecord }) {
  const [p, setP] = useState<Persona | null>(null);
  useEffect(() => {
    void api
      .getPersona(v.agent)
      .then(setP)
      .catch(() => null);
  }, [v.agent]);
  if (!p) {
    return (
      <div className="ink-panel" style={{ padding: "12px 14px", color: "var(--txt-faint)" }}>
        {v.agent} · {v.vote}
      </div>
    );
  }
  return (
    <div
      className="ink-panel"
      style={{
        padding: "12px 14px",
        borderLeft: `3px solid ${VOTE_META[v.vote].color}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar p={p} size={34} ring={false} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.name}
            </span>
            {v.changed && (
              <span title={`Changed from ${v.from}`} style={{ color: "var(--gold)" }}>
                <Icon name="refresh" size={12} />
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--txt-faint)" }}>
            {ROLE_META[p.role]?.label || p.role}
          </div>
        </div>
        <VoteTag vote={v.vote} sm />
      </div>
      {v.reasoning && (
        <p
          style={{
            fontSize: 12.5,
            color: "var(--txt-mute)",
            lineHeight: 1.5,
            margin: "10px 0 0",
            paddingLeft: 45,
          }}
        >
          “{v.reasoning}”
        </p>
      )}
    </div>
  );
}

function Timeline({ changes }: { changes: VoteRecord[] }) {
  if (!changes.length) {
    return (
      <EmptyState icon="refresh" text="No agents changed their vote in this debate." />
    );
  }
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 9,
          alignItems: "center",
          marginBottom: 22,
          fontSize: 13.5,
          color: "var(--txt-mute)",
        }}
      >
        <Icon name="spark" size={16} style={{ color: "var(--gold)" }} />
        <span>
          <b style={{ color: "var(--txt)" }}>{changes.length} agents</b> shifted their position over
          the course of deliberation — the persuasion mechanic at work.
        </span>
      </div>
      <div style={{ position: "relative", paddingLeft: 30 }}>
        <div
          style={{
            position: "absolute",
            left: 9,
            top: 6,
            bottom: 6,
            width: 2,
            background: "var(--ink-line)",
          }}
        />
        <div style={{ display: "grid", gap: 16 }}>
          {changes.map((v) => (
            <ChangeCard key={v.agent} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangeCard({ v }: { v: VoteRecord }) {
  const [p, setP] = useState<Persona | null>(null);
  useEffect(() => {
    void api
      .getPersona(v.agent)
      .then(setP)
      .catch(() => null);
  }, [v.agent]);
  if (!p) return <div className="ink-panel" style={{ padding: 16 }} />;
  return (
    <div className="ink-panel" style={{ padding: "16px 18px", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: -29,
          top: 20,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--gold)",
          border: "3px solid var(--ink)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <Avatar p={p} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="serif" style={{ fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>
              {p.name}
            </span>
            <PartyTag party={p.party} size="sm" />
          </div>
          <div style={{ fontSize: 12, color: "var(--txt-faint)" }}>{p.title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {v.from && <VoteTag vote={v.from} sm />}
          <Icon name="arrowR" size={18} style={{ color: "var(--gold)" }} />
          <VoteTag vote={v.vote} sm />
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--txt-mute)",
          lineHeight: 1.55,
          margin: "12px 0 0",
          paddingLeft: 53,
        }}
      >
        “{v.reasoning}”
      </p>
    </div>
  );
}

function FullTranscript({
  turns,
  debate,
  nav,
}: {
  turns: Turn[];
  debate: DebateDetail;
  nav: ResultsProps["nav"];
}) {
  if (!turns.length) {
    return (
      <EmptyState
        icon="transcript"
        text="Transcript is empty (debate may have failed before any turns)."
        action={
          <Btn kind="ghost" icon="play" onClick={() => nav("arena", debate.id)}>
            Open in arena
          </Btn>
        }
      />
    );
  }
  const phases = Array.from(new Set(turns.map((t) => t.phase)));
  return (
    <div style={{ display: "grid", gap: 26 }}>
      {phases.map((ph) => (
        <div key={ph}>
          <div className="gold-rule" style={{ marginBottom: 16 }}>
            <span className="eyebrow">{PHASE_LABEL[ph] || ph}</span>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {turns
              .filter((t) => t.phase === ph)
              .map((t) => (
                <TurnRow key={t.id} t={t} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TurnRow({ t }: { t: Turn }) {
  const [p, setP] = useState<Persona | null>(null);
  useEffect(() => {
    void api
      .getPersona(t.agent)
      .then(setP)
      .catch(() => null);
  }, [t.agent]);
  if (!p) return null;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <Avatar p={p} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span
            className="serif"
            style={{
              fontSize: 15.5,
              fontWeight: 600,
              color: partyBright(p.party),
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--txt-faint)" }}>
            {p.title}
            {t.round ? ` · Round ${t.round}` : ""}
          </span>
        </div>
        <p style={{ fontSize: 14, color: "var(--txt-mute)", lineHeight: 1.65, margin: 0 }}>
          {t.content}
        </p>
      </div>
    </div>
  );
}

function Amendments({ amendments }: { amendments: Amendment[] }) {
  if (!amendments.length) {
    return <EmptyState icon="doc" text="No amendments were tabled in this debate." />;
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {amendments.map((a, i) => (
        <div
          key={a.id}
          className="ink-panel"
          style={{ padding: "18px 22px", display: "flex", gap: 18, alignItems: "center" }}
        >
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--gold-deep)", width: 32 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 15,
                fontFamily: "var(--serif)",
                lineHeight: 1.5,
                margin: "0 0 8px",
                color: "var(--txt)",
              }}
            >
              {a.text}
            </p>
          </div>
          <StatusTag status={a.status} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  text,
  action,
}: {
  icon: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ink-panel" style={{ padding: "50px 30px", textAlign: "center" }}>
      <Icon name={icon} size={30} style={{ color: "var(--ink-line)", margin: "0 auto 14px" }} />
      <div style={{ fontSize: 14, color: "var(--txt-mute)", marginBottom: action ? 16 : 0 }}>
        {text}
      </div>
      {action}
    </div>
  );
}
