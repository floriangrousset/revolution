import { useState } from "react";
import { api } from "../api";
import { Btn } from "../components/Btn";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  debateId: string;
  debateTitle: string;
}

type Fmt = "pdf" | "md" | "json";

const FORMATS: { id: Fmt; label: string; note: string; icon: string }[] = [
  {
    id: "pdf",
    label: "PDF dossier",
    note: "Formatted resolution with full transcript, votes, and amendments.",
    icon: "doc",
  },
  {
    id: "md",
    label: "Markdown",
    note: "Plain-text transcript for archives or version control.",
    icon: "transcript",
  },
  {
    id: "json",
    label: "JSON record",
    note: "Structured data — every turn, vote, and amendment.",
    icon: "copy",
  },
];

export function ExportModal({ open, onClose, debateId, debateTitle }: ExportModalProps) {
  const [fmt, setFmt] = useState<Fmt>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const blob = await api.exportDebate(debateId, fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${debateTitle.replace(/[^a-zA-Z0-9._-]+/g, "_").toLowerCase().slice(0, 60)}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      setError((e as Error).message || String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Export resolution" title={debateTitle} width={520}>
      <div style={{ display: "grid", gap: 11, marginBottom: 20 }}>
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFmt(f.id)}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: "15px 17px",
              borderRadius: "var(--r-md)",
              textAlign: "left",
              background: fmt === f.id ? "var(--ink3)" : "var(--ink)",
              border: `1px solid ${fmt === f.id ? "var(--gold-deep)" : "var(--ink-line)"}`,
            }}
          >
            <Icon
              name={f.icon}
              size={20}
              style={{ color: fmt === f.id ? "var(--gold-bright)" : "var(--txt-faint)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 12.5, color: "var(--txt-mute)", marginTop: 2 }}>{f.note}</div>
            </div>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: `2px solid ${fmt === f.id ? "var(--gold-bright)" : "var(--ink-line)"}`,
                display: "grid",
                placeItems: "center",
              }}
            >
              {fmt === f.id && (
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
          </button>
        ))}
      </div>
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            background: "rgba(192,57,43,0.12)",
            border: "1px solid var(--reject)",
            color: "var(--reject)",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Btn kind="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn kind="primary" icon="download" onClick={download} disabled={downloading}>
          {downloading ? "Generating…" : `Download ${fmt.toUpperCase()}`}
        </Btn>
      </div>
    </Modal>
  );
}
