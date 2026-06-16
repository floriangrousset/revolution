import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { api } from "../api";
import type { SettingsPayload } from "../api";
import { Btn } from "../components/Btn";
import { Card, SectionTitle } from "../components/Card";
import { Field, TextArea, TextInput, inputStyle } from "../components/Form";
import { Icon } from "../components/Icon";
import { T } from "../theme";

interface SettingsProps {
  nav: (route: string, param?: string) => void;
}

type Section = "engine" | "prompts" | "reference";

const MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", tag: "Highest fidelity" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", tag: "Balanced default" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", tag: "Fastest / cheapest" },
];

const PROMPT_LABELS: Record<string, string> = {
  AGENT_SYSTEM_PROMPT: "Agent system",
  PARTY_HEAD_INTRO_PROMPT: "Party head intro",
  ADVISOR_ANALYSIS_PROMPT: "Advisor analysis",
  ASSISTANT_RESEARCH_PROMPT: "Assistant research",
  SYNTHESIS_PROMPT: "Party synthesis",
  DEBATE_OPENING_PROMPT: "Debate opening",
  DEBATE_REBUTTAL_PROMPT: "Debate rebuttal",
  VOTING_PROMPT: "Voting",
};

export function Settings(_props: SettingsProps) {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("engine");

  const refresh = () =>
    api
      .getSettings()
      .then((s) => setSettings(s))
      .catch((e) => setError(String(e.message || e)));

  useEffect(() => {
    void refresh();
  }, []);

  if (error && !settings) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <Card pad={20} style={{ borderLeft: "3px solid var(--reject)" }}>
          <div style={{ color: "var(--reject)" }}>{error}</div>
        </Card>
      </div>
    );
  }
  if (!settings) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px 60px" }}>
        <div style={{ color: "var(--txt-faint)", fontSize: 14 }}>Loading settings…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 40px 60px" }}>
      <SectionTitle
        eyebrow="Configuration"
        title="Settings"
        sub="Engine credentials, the system prompts the LLM receives, and the vocabularies that govern personas. Everything here is persisted to data/settings.json and read by both the web app and the CLI."
      />

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid var(--ink-line)",
        }}
      >
        <TabBtn
          active={section === "engine"}
          icon="bolt"
          label="Engine"
          onClick={() => setSection("engine")}
        />
        <TabBtn
          active={section === "prompts"}
          icon="feather"
          label="System prompts"
          onClick={() => setSection("prompts")}
        />
        <TabBtn
          active={section === "reference"}
          icon="settings"
          label="Reference lists"
          onClick={() => setSection("reference")}
        />
      </div>

      {section === "engine" && <EngineSection settings={settings} refresh={refresh} />}
      {section === "prompts" && <PromptsSection settings={settings} refresh={refresh} />}
      {section === "reference" && <ReferenceSection settings={settings} refresh={refresh} />}
    </div>
  );
}

function TabBtn({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 18px",
        background: "none",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
        marginBottom: -1,
        color: active ? "var(--txt)" : "var(--txt-faint)",
        fontSize: 13.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Engine section: API key + default model + default temperature.
// ---------------------------------------------------------------------------

function EngineSection({
  settings,
  refresh,
}: {
  settings: SettingsPayload;
  refresh: () => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.default_model);
  const [temp, setTemp] = useState(settings.default_temperature);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    model?: string;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    apiKey.length > 0 ||
    model !== settings.default_model ||
    temp !== settings.default_temperature;

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const patch: Record<string, unknown> = {};
      if (apiKey.length > 0) patch.anthropic_api_key = apiKey;
      if (model !== settings.default_model) patch.default_model = model;
      if (temp !== settings.default_temperature) patch.default_temperature = temp;
      await api.updateSettings(patch);
      setApiKey("");
      setMsg("Saved.");
      await refresh();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const candidate = apiKey.length > 0 ? apiKey : undefined;
      const r = await api.testApiKey(candidate);
      setTestResult(r);
    } catch (e) {
      setTestResult({ ok: false, error: String((e as Error).message || e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <Card pad={26}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Anthropic API key
        </div>
        <Field
          label="Key"
          hint={
            settings.api_key_set
              ? `Currently saved · preview: ${settings.api_key_preview}`
              : "No key saved yet."
          }
        >
          <TextInput
            type="password"
            placeholder={settings.api_key_set ? "Paste a new key to replace…" : "sk-ant-…"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Btn kind="ghost" icon="bolt" onClick={test} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </Btn>
          {testResult && (
            <span
              style={{
                fontSize: 12.5,
                color: testResult.ok ? "var(--pass)" : "var(--reject)",
                fontWeight: 600,
              }}
            >
              {testResult.ok
                ? `✓ OK (${testResult.model})`
                : `✗ ${testResult.error || "Failed"}`}
            </span>
          )}
        </div>
      </Card>

      <Card pad={26}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Default reasoning model
        </div>
        <div style={{ display: "grid", gap: 11 }}>
          {MODELS.map((mo) => (
            <button
              key={mo.id}
              onClick={() => setModel(mo.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "13px 17px",
                borderRadius: "var(--r-md)",
                textAlign: "left",
                background: model === mo.id ? "var(--ink3)" : "var(--ink)",
                border: `1px solid ${model === mo.id ? "var(--gold-deep)" : "var(--ink-line)"}`,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${model === mo.id ? "var(--gold-bright)" : "var(--ink-line)"}`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {model === mo.id && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--gold-bright)",
                    }}
                  />
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{mo.label}</div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--txt-faint)", marginTop: 2 }}
                >
                  {mo.id}
                </div>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--gold-bright)" }}>{mo.tag}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card pad={26}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Default temperature
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 11,
          }}
        >
          <span style={{ fontSize: 13.5, color: "var(--txt-mute)" }}>
            New debates start from this value; you can override per-debate on the Launch screen.
          </span>
          <span className="mono" style={{ fontSize: 13, color: "var(--gold-bright)" }}>
            {temp.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={temp}
          onChange={(e) => setTemp(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: T.gold }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--txt-faint)",
            marginTop: 7,
          }}
        >
          <span>Disciplined · on-message</span>
          <span>Volatile · unpredictable</span>
        </div>
      </Card>

      {err && (
        <Card pad={14} style={{ borderLeft: "3px solid var(--reject)" }}>
          <div style={{ color: "var(--reject)", fontSize: 13 }}>{err}</div>
        </Card>
      )}
      {msg && (
        <Card pad={14} style={{ borderLeft: "3px solid var(--pass)" }}>
          <div style={{ color: "var(--pass)", fontSize: 13 }}>{msg}</div>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn kind="primary" icon="check" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System prompts — tabbed monospace editor.
// ---------------------------------------------------------------------------

function PromptsSection({
  settings,
  refresh,
}: {
  settings: SettingsPayload;
  refresh: () => Promise<void>;
}) {
  const names = useMemo(() => Object.keys(settings.system_prompts), [settings.system_prompts]);
  const [active, setActive] = useState(names[0]);
  const [draft, setDraft] = useState(settings.system_prompts[active] || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings.system_prompts[active] || "");
    setErr(null);
    setMsg(null);
  }, [active, settings.system_prompts]);

  const dirty = draft !== settings.system_prompts[active];

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await api.updateSettings({ system_prompts: { [active]: draft } });
      setMsg("Saved.");
      await refresh();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const next = await api.resetPrompt(active);
      setMsg("Reset to default.");
      setDraft(next.system_prompts[active] || "");
      await refresh();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid var(--ink-line)",
            overflowX: "auto",
            background: "var(--ink1)",
          }}
        >
          {names.map((n) => (
            <button
              key={n}
              onClick={() => setActive(n)}
              style={{
                padding: "11px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: active === n ? "var(--ink3)" : "transparent",
                border: "none",
                borderRight: "1px solid var(--ink-line)",
                color: active === n ? "var(--gold-bright)" : "var(--txt-mute)",
                cursor: "pointer",
              }}
            >
              {PROMPT_LABELS[n] || n}
            </button>
          ))}
        </div>
        <div style={{ padding: 20, display: "grid", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--txt-faint)",
              fontFamily: "var(--mono)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
            }}
          >
            Constant: {active}
          </div>
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12.5,
              lineHeight: 1.55,
              minHeight: 360,
              whiteSpace: "pre",
              tabSize: 2,
            }}
            spellCheck={false}
          />
          <div style={{ fontSize: 11, color: "var(--txt-faint)", lineHeight: 1.55 }}>
            Use Python <code>{"{placeholder}"}</code> syntax for substitutions. Required
            placeholders are validated server-side; saves that drop a required slot are
            rejected.
          </div>
          {err && (
            <div style={{ color: "var(--reject)", fontSize: 13 }}>{err}</div>
          )}
          {msg && (
            <div style={{ color: "var(--pass)", fontSize: 13 }}>{msg}</div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn kind="ghost" onClick={reset} disabled={saving}>
              Reset to default
            </Btn>
            <Btn kind="primary" icon="check" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save prompt"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reference lists — add-only chips.
// ---------------------------------------------------------------------------

function ReferenceSection({
  settings,
  refresh,
}: {
  settings: SettingsPayload;
  refresh: () => Promise<void>;
}) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <ListEditor
        label="Roles"
        list_id="roles"
        items={settings.reference_lists.roles}
        hint="Personas reference these. Existing entries can't be removed in this release; you can add new ones (e.g. 'whip', 'deputy') and reassign personas to them."
        refresh={refresh}
      />
      <ListEditor
        label="Negotiation postures"
        list_id="negotiation_postures"
        items={settings.reference_lists.negotiation_postures}
        hint="The strategic stances available to a persona during deliberation. New entries become available immediately in the Persona Manager dropdowns."
        refresh={refresh}
      />
    </div>
  );
}

function ListEditor({
  label,
  list_id,
  items,
  hint,
  refresh,
}: {
  label: string;
  list_id: "roles" | "negotiation_postures";
  items: string[];
  hint: string;
  refresh: () => Promise<void>;
}) {
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const value = newItem.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!value) return;
    if (items.includes(value)) {
      setErr(`'${value}' already exists.`);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.updateSettings({
        reference_lists: { [list_id]: [...items, value] },
      });
      setNewItem("");
      await refresh();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card pad={22}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--txt-mute)", margin: "0 0 14px", lineHeight: 1.55 }}>
        {hint}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: "var(--ink)",
              border: "1px solid var(--ink-line)",
              color: "var(--txt)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`Add a new ${label.toLowerCase().replace(/s$/, "")}…`}
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />
        <Btn kind="primary" icon="plus" onClick={add} disabled={saving || !newItem.trim()}>
          {saving ? "Adding…" : "Add"}
        </Btn>
      </div>
      {err && (
        <div style={{ marginTop: 10, color: "var(--reject)", fontSize: 13 }}>{err}</div>
      )}
    </Card>
  );
}
