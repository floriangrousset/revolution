import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { PartyTag, PostureTag, RoleTag } from "../components/Tags";
import { POSTURE_META } from "../meta";
import { partyColor } from "../theme";
import type { Persona } from "../types";

interface PersonaDetailProps {
  id: string;
  nav: (route: string, param?: string) => void;
}

export function PersonaDetail({ id, nav }: PersonaDetailProps) {
  const [p, setP] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setP(null);
    setError(null);
    void api
      .getPersona(id)
      .then(setP)
      .catch((e) => setError(String(e.message || e)));
  }, [id]);

  if (error) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <Card pad={20} style={{ borderLeft: "3px solid var(--reject)" }}>
          <div style={{ color: "var(--reject)" }}>Couldn't load persona: {error}</div>
        </Card>
      </div>
    );
  }
  if (!p) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <div style={{ color: "var(--txt-faint)", fontSize: 14 }}>Loading persona…</div>
      </div>
    );
  }

  const lookupAgents = (ids: string[]): Promise<Persona[]> =>
    Promise.all(ids.map((aid) => api.getPersona(aid).catch(() => null))).then((rs) =>
      rs.filter((x): x is Persona => x !== null),
    );

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 22,
          fontSize: 13,
          color: "var(--txt-mute)",
        }}
      >
        <button
          onClick={() => nav("personas")}
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
          <Icon name="chevL" size={16} /> Persona Manager
        </button>
      </div>

      <div
        className="ink-panel"
        style={{
          padding: "28px 32px",
          marginBottom: 22,
          position: "relative",
          overflow: "hidden",
          borderTop: `3px solid ${partyColor(p.party)}`,
        }}
      >
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
          <Avatar p={p} size={78} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <PartyTag party={p.party} />
              <RoleTag role={p.role} />
              <PostureTag posture={p.negotiation_posture} />
            </div>
            <h1
              className="serif"
              style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px", whiteSpace: "nowrap" }}
            >
              {p.name}
            </h1>
            <div style={{ fontSize: 15, color: "var(--txt-mute)" }}>{p.title}</div>
            <div
              className="mono"
              style={{ fontSize: 12, color: "var(--txt-faint)", marginTop: 10 }}
            >
              {p.id}
              {p.persona_last_updated ? ` · updated ${p.persona_last_updated}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 22 }}>
        <div style={{ display: "grid", gap: 22 }}>
          <Block title="Specialty" icon="spark">
            <p style={pStyle}>{p.specialty}</p>
          </Block>

          <Block title="Governing Philosophy" icon="feather">
            <p
              style={{
                ...pStyle,
                fontFamily: "var(--serif)",
                fontSize: 16,
                lineHeight: 1.65,
                fontStyle: "italic",
                color: "var(--txt)",
              }}
            >
              “{p.philosophy}”
            </p>
          </Block>

          <Block title="Communication Style" icon="transcript">
            <p style={pStyle}>{p.communication_style}</p>
          </Block>

          <Block title="Key Positions" icon="check">
            <List items={p.key_positions} color="var(--support)" mark="check" />
          </Block>

          <Block title="Red Lines" icon="x">
            <List items={p.red_lines} color="var(--oppose)" mark="x" />
          </Block>

          <Block title="Rhetorical Signatures" icon="feather">
            <List
              items={p.rhetorical_signatures}
              color="var(--gold-bright)"
              mark="dot"
            />
          </Block>
        </div>

        <div style={{ display: "grid", gap: 22, alignContent: "start" }}>
          <Block title="Negotiation Posture" icon="scale">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22, color: "var(--gold-bright)" }}>
                  {POSTURE_META[p.negotiation_posture].glyph}
                </span>
                <span className="serif" style={{ fontSize: 17, fontWeight: 600 }}>
                  {POSTURE_META[p.negotiation_posture].label}
                </span>
              </div>
              <p style={{ ...pStyle, fontSize: 13 }}>
                {POSTURE_META[p.negotiation_posture].desc}
              </p>
            </div>
          </Block>

          <Block title="Constituency" icon="flag">
            <p style={pStyle}>{p.constituency || "Not specified."}</p>
          </Block>

          <Relationships allies={p.allies} rivals={p.rivals} nav={nav} lookup={lookupAgents} />
        </div>
      </div>
    </div>
  );
}

const pStyle: CSSProperties = {
  fontSize: 14,
  color: "var(--txt-mute)",
  lineHeight: 1.65,
  margin: 0,
};

function Block({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="ink-panel" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <Icon name={icon} size={15} style={{ color: "var(--gold)" }} />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--txt-faint)",
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function List({ items, color, mark }: { items: string[]; color: string; mark: string }) {
  if (!items?.length) {
    return <span style={{ fontSize: 13, color: "var(--txt-faint)" }}>None recorded</span>;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name={mark} size={14} stroke={2.2} style={{ color, marginTop: 3 }} />
          <span style={{ fontSize: 13.5, color: "var(--txt-mute)", lineHeight: 1.55 }}>{it}</span>
        </div>
      ))}
    </div>
  );
}

function Relationships({
  allies,
  rivals,
  nav,
  lookup,
}: {
  allies: string[];
  rivals: string[];
  nav: (route: string, param?: string) => void;
  lookup: (ids: string[]) => Promise<Persona[]>;
}) {
  const [a, setA] = useState<Persona[]>([]);
  const [r, setR] = useState<Persona[]>([]);

  useEffect(() => {
    void lookup(allies).then(setA);
    void lookup(rivals).then(setR);
  }, [allies.join("|"), rivals.join("|")]);

  const row: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 9px",
    borderRadius: "var(--r-md)",
    background: "var(--ink)",
    border: "1px solid var(--ink-line)",
    color: "var(--txt)",
    width: "100%",
    textAlign: "left",
  };

  return (
    <Block title="In-Room Relationships" icon="graph">
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--support)",
          marginBottom: 8,
        }}
      >
        Allies
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {a.length ? (
          a.map((ally) => (
            <button key={ally.id} onClick={() => nav("personas", ally.id)} style={row}>
              <Avatar p={ally} size={30} ring={false} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{ally.name}</span>
              <Icon
                name="chevR"
                size={14}
                style={{ marginLeft: "auto", color: "var(--txt-faint)" }}
              />
            </button>
          ))
        ) : (
          <span style={{ fontSize: 13, color: "var(--txt-faint)" }}>None recorded</span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--oppose)",
          marginBottom: 8,
        }}
      >
        Rivals
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {r.length ? (
          r.map((rival) => (
            <button key={rival.id} onClick={() => nav("personas", rival.id)} style={row}>
              <Avatar p={rival} size={30} ring={false} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{rival.name}</span>
              <Icon
                name="chevR"
                size={14}
                style={{ marginLeft: "auto", color: "var(--txt-faint)" }}
              />
            </button>
          ))
        ) : (
          <span style={{ fontSize: 13, color: "var(--txt-faint)" }}>None recorded</span>
        )}
      </div>
    </Block>
  );
}
