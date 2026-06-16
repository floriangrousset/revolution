import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Btn } from "../components/Btn";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { Seal } from "../components/Seal";

interface ArenaWaitingProps {
  nav: (route: string, param?: string) => void;
  param?: string;
}

const POLL_MS = 2000;
const TERMINAL = new Set(["passed", "rejected", "amended", "error"]);

export function ArenaWaiting({ nav, param }: ArenaWaitingProps) {
  const id = param;
  const [status, setStatus] = useState<string>("pending");
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const poll = async () => {
      try {
        const d = await api.getDebate(id);
        setStatus(d.status);
        setTitle(d.title);
        if (d.status === "error" && d.error) setError(d.error);
        if (TERMINAL.has(d.status)) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          if (d.status !== "error") nav("results", id);
        }
      } catch (e) {
        setError((e as Error).message || String(e));
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      }
    };
    void poll();
    intervalRef.current = window.setInterval(poll, POLL_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [id, nav]);

  if (!id) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 40px" }}>
        <Card pad={32} style={{ textAlign: "center" }}>
          <Icon name="launch" size={32} style={{ color: "var(--gold)", marginBottom: 14 }} />
          <div style={{ color: "var(--txt-mute)", fontSize: 14 }}>
            Open a debate from the dashboard, or launch a new one.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 40px" }}>
      <div
        className="ink-panel"
        style={{ padding: "40px 36px", position: "relative", overflow: "hidden", textAlign: "center" }}
      >
        <div style={{ position: "absolute", right: -40, top: -40, opacity: 0.06 }}>
          <Seal size={260} />
        </div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          The Floor · In Session
        </div>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 16px" }}>
          {title || "Convening the chamber"}
        </h1>

        {error ? (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--r-md)",
              background: "rgba(192,57,43,0.12)",
              border: "1px solid var(--reject)",
              color: "var(--reject)",
              fontSize: 14,
              textAlign: "left",
              maxWidth: 520,
              margin: "0 auto 18px",
            }}
          >
            <b>Debate failed.</b> {error}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 15, color: "var(--txt-mute)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 22px" }}>
              The chamber is deliberating. Agents are forming positions, debating across the aisle,
              and casting votes. This may take several minutes.
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                borderRadius: 999,
                background: "var(--ink2)",
                border: "1px solid var(--gold-deep)",
                color: "var(--gold-bright)",
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--gold-bright)",
                  animation: "blink 1.4s step-end infinite",
                }}
              />
              {labelFor(status)}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--txt-faint)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              The live arena (with a streaming legislative hemicycle) lights up in M4. This page
              waits for the debate to finish and forwards to the full results.
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn kind="ghost" onClick={() => nav("dashboard")}>
            Back to the Floor
          </Btn>
          {error && (
            <Btn kind="primary" icon="launch" onClick={() => nav("launch")}>
              Launch another
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function labelFor(status: string): string {
  switch (status) {
    case "pending":
      return "Pending · queueing";
    case "running":
      return "Deliberating live";
    case "voting":
      return "Calling the vote";
    case "error":
      return "Error";
    default:
      return status;
  }
}
