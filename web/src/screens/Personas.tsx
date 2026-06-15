import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { Btn } from "../components/Btn";
import { Card, SectionTitle } from "../components/Card";
import { inputStyle } from "../components/Form";
import { Icon } from "../components/Icon";
import { PostureTag, RoleTag } from "../components/Tags";
import { ROLE_META } from "../meta";
import { partyColor } from "../theme";
import type { PersonaSummary, Role } from "../types";

import { PersonaDetail } from "./PersonaDetail";

interface PersonasProps {
  nav: (route: string, param?: string) => void;
  param?: string;
}

export function Personas({ nav, param }: PersonasProps) {
  if (param) {
    return <PersonaDetail id={param} nav={nav} />;
  }
  return <PersonaManager nav={nav} />;
}

function PersonaManager({ nav }: { nav: PersonasProps["nav"] }) {
  const [all, setAll] = useState<PersonaSummary[]>([]);
  const [q, setQ] = useState("");
  const [party, setParty] = useState<"all" | "democrat" | "republican">("all");
  const [role, setRole] = useState<"all" | Role>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .listPersonas()
      .then((r) => setAll(r.personas))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  const list = useMemo(() => {
    return all.filter((p) => {
      if (party !== "all" && p.party !== party) return false;
      if (role !== "all" && p.role !== role) return false;
      if (q) {
        const haystack = (p.name + p.title + p.specialty).toLowerCase();
        if (!haystack.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [all, party, role, q]);

  const dems = list.filter((p) => p.party === "democrat");
  const reps = list.filter((p) => p.party === "republican");

  const FilterChip = ({
    active,
    onClick,
    children,
    color,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    color?: string;
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        background: active ? "var(--ink3)" : "transparent",
        color: active ? color || "var(--gold-bright)" : "var(--txt-mute)",
        border: `1px solid ${active ? color || "var(--gold-deep)" : "var(--ink-line)"}`,
        transition: "all .15s ease",
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 40px 60px" }}>
      <SectionTitle
        eyebrow={`The Floor · ${all.length} Seated Agents`}
        title="Persona Manager"
        sub="Each agent carries a documented philosophy, red lines, rhetorical signatures, in-room allies and rivals, and a negotiation posture that governs how it behaves in debate."
        right={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn kind="ghost" icon="graph" onClick={() => nav("graph")}>
              Relationship graph
            </Btn>
          </div>
        }
      />

      {error && (
        <Card pad={16} style={{ marginBottom: 18, borderLeft: "3px solid var(--reject)" }}>
          <div style={{ color: "var(--reject)", fontSize: 13 }}>
            Couldn't load personas: {error}
          </div>
        </Card>
      )}

      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          marginBottom: 26,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <Icon
            name="search"
            size={16}
            style={{ position: "absolute", left: 13, top: 12, color: "var(--txt-faint)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, title, specialty…"
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <FilterChip active={party === "all"} onClick={() => setParty("all")}>
            All
          </FilterChip>
          <FilterChip
            active={party === "democrat"}
            color="var(--dem-bright)"
            onClick={() => setParty("democrat")}
          >
            Democrat
          </FilterChip>
          <FilterChip
            active={party === "republican"}
            color="var(--rep-bright)"
            onClick={() => setParty("republican")}
          >
            Republican
          </FilterChip>
        </div>
        <div style={{ width: 1, height: 24, background: "var(--ink-line)" }} />
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "party_head", "advisor", "assistant"] as const).map((r) => (
            <FilterChip key={r} active={role === r} onClick={() => setRole(r)}>
              {r === "all" ? "All roles" : ROLE_META[r].label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <Caucus title="Democratic Caucus" party="democrat" people={dems} nav={nav} />
        <Caucus title="Republican Conference" party="republican" people={reps} nav={nav} />
      </div>
    </div>
  );
}

function Caucus({
  title,
  party,
  people,
  nav,
}: {
  title: string;
  party: "democrat" | "republican";
  people: PersonaSummary[];
  nav: PersonasProps["nav"];
}) {
  const head = people.filter((p) => p.role === "party_head");
  const adv = people.filter((p) => p.role === "advisor");
  const asst = people.filter((p) => p.role === "assistant");
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `2px solid ${partyColor(party)}`,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: partyColor(party),
            flexShrink: 0,
          }}
        />
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap" }}>
          {title}
        </div>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--txt-faint)",
            marginLeft: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {people.length} seated
        </span>
      </div>
      <div style={{ display: "grid", gap: 11 }}>
        {[...head, ...adv, ...asst].map((p) => (
          <PersonaCard key={p.id} p={p} nav={nav} />
        ))}
        {people.length === 0 && (
          <div
            style={{
              color: "var(--txt-faint)",
              fontSize: 13,
              padding: 20,
              textAlign: "center",
            }}
          >
            No agents match.
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaCard({ p, nav }: { p: PersonaSummary; nav: PersonasProps["nav"] }) {
  return (
    <Card
      hover
      pad={15}
      onClick={() => nav("personas", p.id)}
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        borderLeft: `3px solid ${partyColor(p.party)}`,
      }}
    >
      <Avatar p={p} size={48} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            className="serif"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--txt)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.name}
          </span>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--txt-mute)",
            marginTop: 2,
            marginBottom: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.title}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <RoleTag role={p.role} />
          <PostureTag posture={p.negotiation_posture} />
        </div>
      </div>
      <Icon name="chevR" size={18} style={{ color: "var(--txt-faint)" }} />
    </Card>
  );
}
