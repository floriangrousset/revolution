import { useEffect, useState } from "react";
import { api } from "./api";
import { DisclaimerBar } from "./components/DisclaimerBar";
import { Sidebar } from "./components/Sidebar";
import { useHashRoute } from "./hooks";
import { Dashboard } from "./screens/Dashboard";
import { Graph } from "./screens/Graph";
import { Personas } from "./screens/Personas";
import { Placeholder } from "./screens/Placeholder";

export function App() {
  const [{ route, param }, nav] = useHashRoute();
  const [model, setModel] = useState<string | undefined>();

  useEffect(() => {
    void api
      .health()
      .then((h) => setModel(h.model))
      .catch(() => {
        /* server might still be starting; sidebar shows the default */
      });
  }, []);

  let Screen;
  switch (route) {
    case "personas":
      Screen = <Personas nav={nav} param={param} />;
      break;
    case "launch":
      Screen = (
        <Placeholder
          eyebrow="Convene the Floor"
          title="Launch a Debate"
          description="Submit a proposal, set the terms of deliberation, and the chamber will form positions, debate across the aisle, and vote."
          comingIn="Wires up in M3."
          nav={nav}
        />
      );
      break;
    case "arena":
      Screen = (
        <Placeholder
          eyebrow="Live Deliberation"
          title="The Arena"
          description="The legislative chamber hemicycle — agents speak in turn, seats light up, votes tally in real time."
          comingIn="Lights up in M4 with live SSE streaming."
          nav={nav}
        />
      );
      break;
    case "results":
      Screen = (
        <Placeholder
          eyebrow="Resolution"
          title="Vote Breakdown"
          description="Full breakdown, persuasion timeline, transcript, amendments, and export."
          comingIn="Available in M3 once debates run."
          nav={nav}
        />
      );
      break;
    case "graph":
      Screen = <Graph nav={nav} />;
      break;
    default:
      Screen = <Dashboard nav={nav} />;
  }

  const fullBleed = route === "arena";
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar route={route} nav={nav} model={model} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          id="screen"
          style={{ flex: 1, minHeight: 0, overflow: fullBleed ? "hidden" : "auto" }}
        >
          {Screen}
        </div>
        <DisclaimerBar />
      </div>
    </div>
  );
}
