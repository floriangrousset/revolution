import { useEffect, useMemo, useRef, useState } from "react";
import type { DebateDetail } from "../api";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { Btn, IconBtn } from "../components/Btn";
import { TallyBar } from "../components/Card";
import { Icon } from "../components/Icon";
import { PartyTag, PostureTag } from "../components/Tags";
import { T, partyBright, partyColor } from "../theme";
import type { Persona, Turn, VoteRecord, VoteValue } from "../types";

interface ArenaProps {
  nav: (route: string, param?: string) => void;
  param?: string;
}

const PHASE_LABEL: Record<string, string> = {
  intro: "Opening Remarks",
  advisor_discussion: "Caucus Analysis",
  assistant_research: "Staff Research",
  synthesis: "Position Synthesis",
  cross_party_debate: "Cross-Party Debate",
  vote: "Final Vote",
};

const PHASE_SEQ: { key: string; label: string }[] = [
  { key: "intro", label: "Opening" },
  { key: "advisor_discussion", label: "Caucus Analysis" },
  { key: "assistant_research", label: "Staff Research" },
  { key: "synthesis", label: "Synthesis" },
  { key: "cross_party_debate", label: "Cross-Party Debate" },
  { key: "vote", label: "Final Vote" },
];

interface ChamberSeat {
  agentId: string;
  x: number;
  y: number;
  r: number;
  head: boolean;
}

function describeArc(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const p1 = { x: cx + Math.cos((a1 * Math.PI) / 180) * r, y: cy - Math.sin((a1 * Math.PI) / 180) * r };
  const p2 = { x: cx + Math.cos((a2 * Math.PI) / 180) * r, y: cy - Math.sin((a2 * Math.PI) / 180) * r };
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

function buildChamber(personas: Persona[]): {
  seats: ChamberSeat[];
  byId: Record<string, ChamberSeat>;
} {
  const seats: ChamberSeat[] = [];
  const cx = 500;
  const cy = 470;
  (["democrat", "republican"] as const).forEach((party) => {
    const list = personas.filter((p) => p.party === party);
    const head = list.find((p) => p.role === "party_head");
    const rest = list.filter((p) => p.role !== "party_head").slice(0, 10);
    if (!head) return;
    const headDeg = party === "democrat" ? 109 : 71;
    const ha = (headDeg * Math.PI) / 180;
    seats.push({
      agentId: head.id,
      x: cx + Math.cos(ha) * 150,
      y: cy - Math.sin(ha) * 150,
      r: 30,
      head: true,
    });
    const rings = [
      { n: 3, r: 250 },
      { n: 3, r: 340 },
      { n: 4, r: 430 },
    ];
    const span = party === "democrat" ? [173, 118] : [62, 7];
    let idx = 0;
    rings.forEach((ring) => {
      for (let i = 0; i < ring.n; i++) {
        const agent = rest[idx++];
        if (!agent) continue;
        const f = ring.n === 1 ? 0.5 : i / (ring.n - 1);
        const deg = span[0] + (span[1] - span[0]) * f;
        const a = (deg * Math.PI) / 180;
        seats.push({
          agentId: agent.id,
          x: cx + Math.cos(a) * ring.r,
          y: cy - Math.sin(a) * ring.r,
          r: 22,
          head: false,
        });
      }
    });
  });
  const byId: Record<string, ChamberSeat> = {};
  seats.forEach((s) => {
    byId[s.agentId] = s;
  });
  return { seats, byId };
}

interface VoteState {
  agent: string;
  vote: VoteValue;
}

type Stage = "deliberation" | "voting" | "done" | "error";

export function Arena({ nav, param }: ArenaProps) {
  const id = param;
  const [debate, setDebate] = useState<DebateDetail | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string>("intro");
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [stage, setStage] = useState<Stage>("deliberation");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finalTally, setFinalTally] = useState<{
    support: number;
    oppose: number;
    abstain: number;
  } | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Load debate metadata + all 22 personas once.
  useEffect(() => {
    if (!id) return;
    setErrorMsg(null);
    void api
      .getDebate(id)
      .then((d) => {
        setDebate(d);
        if (d.status === "passed" || d.status === "rejected" || d.status === "amended") {
          setStage("done");
          setFinalTally(d.tally);
        }
        if (d.status === "error") {
          setStage("error");
          setErrorMsg(d.error || "Debate failed.");
        }
      })
      .catch((e) => setErrorMsg(String(e.message || e)));
    void api.listPersonas().then((r) => {
      Promise.all(r.personas.map((s) => api.getPersona(s.id))).then(setPersonas);
    });
  }, [id]);

  // SSE wiring — open the stream, hydrate state from event payloads.
  useEffect(() => {
    if (!id || !debate) return;
    if (stage === "done" || stage === "error") {
      // backfill transcript + votes from REST so even the static state has
      // something to show.
      void api.getTranscript(id).then((r) => setTranscript(r.turns));
      void api.getVotes(id).then((r) => setVotes(r.votes));
      return;
    }
    const es = new EventSource(`/api/debates/${id}/stream`);
    const onPhase = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { phase: string; round?: number };
      setActivePhase(data.phase);
      if (data.phase === "vote") setStage("voting");
    };
    const onTurnStart = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { agent: string; phase: string };
      setActiveAgent(data.agent);
      setActivePhase(data.phase);
    };
    const onTurnEnd = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Turn;
      setTranscript((prev) => (prev.find((t) => t.id === data.id) ? prev : [...prev, data]));
    };
    const onVote = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as VoteRecord;
      setStage("voting");
      setActiveAgent(data.agent);
      setVotes((prev) =>
        prev.find((v) => v.agent === data.agent)
          ? prev.map((v) => (v.agent === data.agent ? data : v))
          : [...prev, data],
      );
    };
    const onResult = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        result: string;
        tally: { support: number; oppose: number; abstain: number };
      };
      setFinalTally(data.tally);
      setStage("done");
    };
    const onError = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { message?: string };
        setErrorMsg(data.message || "Debate failed.");
      } catch {
        setErrorMsg("Debate failed.");
      }
      setStage("error");
    };
    const onDone = () => {
      es.close();
    };
    es.addEventListener("phase", onPhase);
    es.addEventListener("turn_start", onTurnStart);
    es.addEventListener("turn_end", onTurnEnd);
    es.addEventListener("vote", onVote);
    es.addEventListener("result", onResult);
    es.addEventListener("error", onError);
    es.addEventListener("done", onDone);
    return () => {
      es.close();
    };
  }, [id, debate, stage]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, votes]);

  const chamber = useMemo(() => buildChamber(personas), [personas]);
  const personaById = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, p])),
    [personas],
  );
  const voteMap = useMemo(() => Object.fromEntries(votes.map((v) => [v.agent, v.vote])), [votes]);
  const tally = useMemo(() => {
    const t = { support: 0, oppose: 0, abstain: 0 };
    votes.forEach((v) => t[v.vote]++);
    return t;
  }, [votes]);
  const totalVotes = personas.length || 22;

  if (!id) {
    return (
      <div style={{ padding: 40, color: "var(--txt-mute)" }}>No debate selected.</div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "16px 28px",
          borderBottom: "1px solid var(--ink-line)",
          background: "var(--ink1)",
        }}
      >
        <button
          onClick={() => nav("dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "var(--txt-faint)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Icon name="chevL" size={20} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Live Deliberation
          </div>
          <div
            className="serif"
            style={{
              fontSize: 18,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {debate?.title || "Convening…"}
          </div>
        </div>
        <PhaseRail currentPhase={activePhase} stage={stage} />
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 400px",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: "10px 18px 0" }}>
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <ChamberView
              seats={chamber.seats}
              personaById={personaById}
              activeId={activeAgent}
              voteMap={voteMap}
              stage={stage}
              currentPhase={activePhase}
              onSeat={(pid) => nav("personas", pid)}
            />
          </div>
          <SpeakerSpotlight
            stage={stage}
            errorMsg={errorMsg}
            transcript={transcript}
            personaById={personaById}
            activeAgent={activeAgent}
            tally={finalTally || tally}
            totalVotes={totalVotes}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 6px 16px" }}>
            <Btn
              kind="ghost"
              icon="results"
              onClick={() => nav("results", id)}
              disabled={stage !== "done"}
            >
              View resolution
            </Btn>
            <IconBtn name="refresh" title="Refresh" onClick={() => location.reload()} />
            <div style={{ marginLeft: "auto", color: "var(--txt-faint)", fontSize: 12 }}>
              {stage === "deliberation" && "Streaming live"}
              {stage === "voting" && "Calling the vote"}
              {stage === "done" && "Resolved"}
              {stage === "error" && "Error"}
            </div>
          </div>
        </div>

        <div
          style={{
            borderLeft: "1px solid var(--ink-line)",
            background: "var(--ink1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "15px 20px",
              borderBottom: "1px solid var(--ink-line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="eyebrow">
              {stage === "voting" || stage === "done" ? "Vote Ledger" : "Transcript"}
            </span>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--txt-faint)" }}>
              {stage === "voting" || stage === "done"
                ? `${votes.length}/${totalVotes}`
                : `${transcript.length} turns`}
            </span>
          </div>
          <div ref={feedRef} style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
            {stage === "voting" || stage === "done" ? (
              <VoteLedger votes={votes} personaById={personaById} />
            ) : (
              <TranscriptFeed transcript={transcript} personaById={personaById} />
            )}
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--ink-line)", background: "var(--ink2)" }}>
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
              height={10}
            />
            {stage === "done" && (
              <Btn
                kind="primary"
                full
                icon="results"
                style={{ marginTop: 14 }}
                onClick={() => nav("results", id)}
              >
                View full resolution
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseRail({ currentPhase, stage }: { currentPhase: string; stage: Stage }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {PHASE_SEQ.map((ph, i) => {
        const curIdx = PHASE_SEQ.findIndex((x) => x.key === currentPhase);
        const done = i < curIdx || stage === "done";
        const active = ph.key === currentPhase && stage !== "done";
        return (
          <div key={ph.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: active
                  ? "var(--gold)"
                  : done
                    ? "rgba(194,161,77,0.1)"
                    : "var(--ink)",
                color: active ? "#1B1405" : done ? "var(--gold-bright)" : "var(--txt-faint)",
                border: `1px solid ${active ? "var(--gold-deep)" : done ? "var(--gold-deep)" : "var(--ink-line)"}`,
              }}
            >
              {ph.label}
            </div>
            {i < PHASE_SEQ.length - 1 && (
              <div
                style={{
                  width: 10,
                  height: 1,
                  background: done ? "var(--gold-deep)" : "var(--ink-line)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChamberView({
  seats,
  personaById,
  activeId,
  voteMap,
  stage,
  currentPhase,
  onSeat,
}: {
  seats: ChamberSeat[];
  personaById: Record<string, Persona>;
  activeId: string | null;
  voteMap: Record<string, VoteValue>;
  stage: Stage;
  currentPhase: string;
  onSeat: (agentId: string) => void;
}) {
  return (
    <svg
      viewBox="0 0 1000 520"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id="daisGlow" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="rgba(226,195,107,0.20)" />
          <stop offset="100%" stopColor="rgba(226,195,107,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1000" height="520" fill="url(#daisGlow)" />
      {[250, 340, 430].map((r) => (
        <path
          key={r}
          d={describeArc(500, 470, r, 180, 0)}
          fill="none"
          stroke="var(--ink-line-soft)"
          strokeWidth="1"
          opacity="0.5"
        />
      ))}
      <g>
        <rect
          x="455"
          y="446"
          width="90"
          height="46"
          rx="6"
          fill="var(--ink2)"
          stroke="var(--gold-deep)"
          strokeWidth="1.2"
        />
        <rect
          x="470"
          y="436"
          width="60"
          height="14"
          rx="3"
          fill="var(--ink3)"
          stroke="var(--gold-deep)"
          strokeWidth="1"
        />
        <text
          x="500"
          y="474"
          textAnchor="middle"
          fontSize="11"
          fill="var(--gold)"
          fontFamily="var(--mono)"
          letterSpacing="1"
        >
          {stage === "done"
            ? "RESOLVED"
            : (PHASE_LABEL[currentPhase]?.toUpperCase().slice(0, 14) || "THE FLOOR")}
        </text>
      </g>
      {seats.map((s) => (
        <Seat
          key={s.agentId}
          seat={s}
          persona={personaById[s.agentId]}
          active={activeId === s.agentId}
          vote={voteMap[s.agentId]}
          onSeat={onSeat}
        />
      ))}
    </svg>
  );
}

function Seat({
  seat,
  persona,
  active,
  vote,
  onSeat,
}: {
  seat: ChamberSeat;
  persona: Persona | undefined;
  active: boolean;
  vote: VoteValue | undefined;
  onSeat: (id: string) => void;
}) {
  if (!persona) return null;
  const initials = persona.name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join("");
  const base = persona.party === "democrat" ? T.dem : T.rep;
  const bright = persona.party === "democrat" ? T.demBright : T.repBright;
  const voteCol =
    vote === "support"
      ? T.support
      : vote === "oppose"
        ? T.oppose
        : vote === "abstain"
          ? T.abstain
          : null;
  const ringCol = voteCol || (active ? T.goldBright : base);
  return (
    <g
      style={{ cursor: "pointer", transition: "all .3s ease" }}
      onClick={() => onSeat(persona.id)}
      transform={`translate(${seat.x},${seat.y})`}
    >
      {active && (
        <circle
          r={seat.r + 9}
          fill="none"
          stroke={T.goldBright}
          strokeWidth="2"
          opacity="0.8"
          style={{ animation: "ring 1.3s ease-out infinite" }}
        />
      )}
      <circle
        r={seat.r}
        fill={active ? bright : base}
        fillOpacity={active ? 0.9 : 0.32}
        stroke={ringCol}
        strokeWidth={active || voteCol ? 2.4 : 1.4}
        style={{
          transition: "all .3s ease",
          filter: active ? "drop-shadow(0 0 10px rgba(226,195,107,.5))" : "none",
        }}
      />
      {seat.head && (
        <circle
          r={seat.r + 4}
          fill="none"
          stroke={T.gold}
          strokeWidth="1"
          opacity="0.7"
          strokeDasharray="2 3"
        />
      )}
      <text
        textAnchor="middle"
        dy={seat.r * 0.34}
        fontSize={seat.r * 0.62}
        fontWeight={700}
        fill={active ? "#0A1626" : bright}
        fontFamily="var(--sans)"
      >
        {initials}
      </text>
      {voteCol && (
        <g transform={`translate(${seat.r * 0.62},${-seat.r * 0.62})`}>
          <circle r="7.5" fill="var(--ink)" stroke={voteCol} strokeWidth="1.6" />
          <path
            d={
              vote === "support"
                ? "M-3 0l2 2 4-4"
                : vote === "oppose"
                  ? "M-3 -3l6 6M3 -3l-6 6"
                  : "M0 0"
            }
            fill="none"
            stroke={voteCol}
            strokeWidth="1.8"
            strokeLinecap="round"
            transform="scale(0.9)"
          />
          {vote === "abstain" && <circle r="2" fill={voteCol} />}
        </g>
      )}
    </g>
  );
}

function SpeakerSpotlight({
  stage,
  errorMsg,
  transcript,
  personaById,
  activeAgent,
  tally,
  totalVotes,
}: {
  stage: Stage;
  errorMsg: string | null;
  transcript: Turn[];
  personaById: Record<string, Persona>;
  activeAgent: string | null;
  tally: { support: number; oppose: number; abstain: number };
  totalVotes: number;
}) {
  if (stage === "error") {
    return (
      <div
        className="ink-panel rise"
        style={{
          padding: "22px 26px",
          borderColor: "var(--reject)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "rgba(192,57,43,0.15)",
            border: "2px solid var(--reject)",
          }}
        >
          <Icon name="x" size={26} stroke={2.4} style={{ color: "var(--reject)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ color: "var(--reject)", marginBottom: 4 }}>
            Debate failed
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: "var(--txt-mute)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {errorMsg}
          </div>
        </div>
      </div>
    );
  }
  if (stage === "done") {
    const passed = tally.support > tally.oppose;
    return (
      <div
        className="ink-panel rise"
        style={{
          padding: "22px 26px",
          borderColor: passed ? "var(--pass)" : "var(--reject)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: passed ? "rgba(62,155,110,0.15)" : "rgba(192,57,43,0.15)",
            border: `2px solid ${passed ? "var(--pass)" : "var(--reject)"}`,
          }}
        >
          <Icon
            name={passed ? "check" : "x"}
            size={26}
            stroke={2.4}
            style={{ color: passed ? "var(--pass)" : "var(--reject)" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            className="eyebrow"
            style={{ color: passed ? "var(--pass)" : "var(--reject)", marginBottom: 4 }}
          >
            Motion {passed ? "Carries" : "Fails"}
          </div>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600 }}>
            {tally.support}–{tally.oppose}
            {tally.abstain ? ` (${tally.abstain} abstaining)` : ""} ·{" "}
            {passed ? "Passed" : "Rejected"}
          </div>
        </div>
      </div>
    );
  }
  if (stage === "voting") {
    const cast = tally.support + tally.oppose + tally.abstain;
    return (
      <div
        className="ink-panel"
        style={{
          padding: "22px 26px",
          borderLeft: "3px solid var(--gold)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "rgba(194,161,77,0.12)",
            border: "2px solid var(--gold-deep)",
          }}
        >
          <Icon name="vote" size={24} style={{ color: "var(--gold-bright)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 5 }}>
            Roll Call in Progress
          </div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600 }}>
            Calling the vote · {cast} of {totalVotes} agents recorded
          </div>
        </div>
      </div>
    );
  }
  const lastTurn = activeAgent
    ? transcript.filter((t) => t.agent === activeAgent).slice(-1)[0]
    : transcript[transcript.length - 1];
  if (!lastTurn || !personaById[lastTurn.agent]) {
    return (
      <div
        className="ink-panel"
        style={{
          padding: "22px 26px",
          color: "var(--txt-faint)",
          textAlign: "center",
          fontSize: 14,
        }}
      >
        Awaiting the first speaker…
      </div>
    );
  }
  const p = personaById[lastTurn.agent];
  return (
    <div
      className="ink-panel"
      style={{
        padding: "20px 24px",
        borderLeft: `3px solid ${partyColor(p.party)}`,
        minHeight: 140,
        display: "flex",
        gap: 18,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Avatar p={p} size={56} />
        <div style={{ marginTop: 8 }}>
          <PostureTag posture={p.negotiation_posture} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
          <span className="serif" style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap" }}>
            {p.name}
          </span>
          <PartyTag party={p.party} size="sm" />
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--txt-faint)",
            marginBottom: 10,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.title} · <span style={{ color: "var(--gold)" }}>{PHASE_LABEL[lastTurn.phase]}</span>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.62, color: "var(--txt)", margin: 0 }}>
          {lastTurn.content}
        </p>
      </div>
    </div>
  );
}

function TranscriptFeed({
  transcript,
  personaById,
}: {
  transcript: Turn[];
  personaById: Record<string, Persona>;
}) {
  if (!transcript.length) {
    return (
      <div
        style={{
          color: "var(--txt-faint)",
          fontSize: 13,
          textAlign: "center",
          padding: "30px 0",
        }}
      >
        The transcript will fill as agents speak.
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 13 }}>
      {transcript.map((t) => {
        const p = personaById[t.agent];
        if (!p) return null;
        return (
          <div key={t.id} className="fade" style={{ display: "flex", gap: 11 }}>
            <Avatar p={p} size={30} ring={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: partyBright(p.party),
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--txt-faint)", whiteSpace: "nowrap" }}>
                  {PHASE_LABEL[t.phase] || t.phase}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "var(--txt-mute)",
                  margin: "3px 0 0",
                }}
              >
                {t.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VoteLedger({
  votes,
  personaById,
}: {
  votes: VoteRecord[];
  personaById: Record<string, Persona>;
}) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {votes.map((v) => {
        const p = personaById[v.agent];
        if (!p) return null;
        const color =
          v.vote === "support"
            ? "var(--support)"
            : v.vote === "oppose"
              ? "var(--oppose)"
              : "var(--abstain)";
        return (
          <div
            key={v.agent}
            className="fade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 11px",
              borderRadius: "var(--r-md)",
              background: "var(--ink)",
              border: "1px solid var(--ink-line)",
              borderLeft: `3px solid ${partyColor(p.party)}`,
            }}
          >
            <Avatar p={p} size={28} ring={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
              {v.changed && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon name="refresh" size={10} /> changed from {v.from}
                </div>
              )}
            </div>
            <span
              style={{
                color,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {v.vote}
            </span>
          </div>
        );
      })}
    </div>
  );
}
