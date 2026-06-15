import { useEffect, useState } from "react";
import { api } from "./api";
import { DisclaimerBar } from "./components/DisclaimerBar";
import { Sidebar } from "./components/Sidebar";
import { useHashRoute } from "./hooks";
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

  // Legacy `#/arena/{id}` → redirect to the Results page (Overview tab now
  // hosts the live chamber visualization). Existing bookmarks keep working.
  useEffect(() => {
    if (route === "arena" && param) nav("results", param);
  }, [route, param, nav]);

  let Screen;
  switch (route) {
    case "personas":
      Screen = <Personas nav={nav} param={param} />;
      break;
    case "launch":
      Screen = <Launch nav={nav} />;
      break;
    case "arena":
      // Redirect-in-flight; render nothing for one tick.
      Screen = null;
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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar route={route} nav={nav} model={model} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div id="screen" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {Screen}
        </div>
        <DisclaimerBar />
      </div>
    </div>
  );
}
