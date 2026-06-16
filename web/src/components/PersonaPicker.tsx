import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { partyColor } from "../theme";
import type { PersonaSummary } from "../types";
import { Icon } from "./Icon";

interface PersonaPickerProps {
  /** Restrict choices to this party (required — allies/rivals are same-party). */
  party: string;
  /** The persona being edited. Excluded from suggestions so it can't pick itself. */
  selfId?: string;
  /** Currently selected ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  accent?: string;
}

export function PersonaPicker({
  party,
  selfId,
  value,
  onChange,
  placeholder = "Search seated personas…",
  accent = "var(--gold-bright)",
}: PersonaPickerProps) {
  const [options, setOptions] = useState<PersonaSummary[]>([]);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (!party) return;
    let cancelled = false;
    void api
      .listPersonas({ party })
      .then((r) => {
        if (!cancelled) setOptions(r.personas);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [party]);

  const optionsById = useMemo(
    () => Object.fromEntries(options.map((o) => [o.id, o])),
    [options],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return options.filter((o) => {
      if (o.id === selfId) return false;
      if (value.includes(o.id)) return false;
      if (!needle) return true;
      return (o.name + o.title + o.id).toLowerCase().includes(needle);
    });
  }, [options, q, value, selfId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {value.map((id) => {
            const o = optionsById[id];
            const name = o ? o.name : id;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 9px 5px 11px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--ink)",
                  border: `1px solid ${partyColor(party)}`,
                  color: "var(--txt)",
                }}
              >
                {!o && (
                  <Icon
                    name="x"
                    size={11}
                    stroke={2.2}
                    style={{ color: "var(--reject)" }}
                  />
                )}
                {name}
                <button
                  onClick={() => onChange(value.filter((x) => x !== id))}
                  title="Remove"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--txt-faint)",
                    padding: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <Icon name="close" size={12} stroke={2.2} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "9px 12px 9px 32px",
            background: "var(--ink)",
            border: `1px solid ${focus ? accent : "var(--ink-line)"}`,
            borderRadius: "var(--r-md)",
            color: "var(--txt)",
            fontSize: 13,
            outline: "none",
            fontFamily: "var(--sans)",
          }}
        />
        <Icon
          name="search"
          size={14}
          style={{ position: "absolute", left: 10, top: 11, color: "var(--txt-faint)" }}
        />
        {focus && filtered.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              maxHeight: 240,
              overflowY: "auto",
              background: "var(--ink2)",
              border: "1px solid var(--ink-line)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-2)",
              zIndex: 50,
            }}
          >
            {filtered.slice(0, 20).map((o) => (
              <button
                key={o.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange([...value, o.id]);
                  setQ("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--txt)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--ink3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: partyColor(o.party),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--txt-faint)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
