import { useEffect, useState } from "react";
import { api } from "./api";
import { DisclaimerBar } from "./components/DisclaimerBar";
import { Sidebar } from "./components/Sidebar";
import { useHashRoute } from "./hooks";
import { Arena } from "./screens/Arena";
import { Dashboard } from "./screens/Dashboard";
import { Graph } from "./screens/Graph";
import { Launch } from "./screens/Launch";
import { Personas } from "./screens/Personas";
import { Results } from "./screens/Results";

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
      Screen = <Launch nav={nav} />;
      break;
    case "arena":
      Screen = <Arena nav={nav} param={param} />;
      break;
    case "results":
      Screen = <Results nav={nav} param={param} />;
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
