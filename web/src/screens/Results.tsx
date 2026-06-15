import { useEffect, useState } from "react";
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

type Tab = "breakdown" | "timeline" | "transcript" | "amendments";

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
  const [tab, setTab] = useState<Tab>("breakdown");
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setError(null);
    Promise.all([
      api.getDebate(id),
      api.getTranscript(id),
      api.getVotes(id),
      api.getAmendments(id),
    ])
      .then(([d, t, v, a]) => {
        setDebate(d);
        setTurns(t.turns);
        setVotes(v.votes);
        setAmendments(a.amendments);
      })
      .catch((e) => setError(String(e.message || e)));
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
