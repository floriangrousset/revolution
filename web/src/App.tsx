import { useEffect } from "react";
import { api } from "./api";
import { DisclaimerBar } from "./components/DisclaimerBar";
import { Sidebar } from "./components/Sidebar";
import { useHashRoute } from "./hooks";
import { setPartyRegistry } from "./theme";
import { Dashboard } from "./screens/Dashboard";
import { Graph } from "./screens/Graph";
import { Launch } from "./screens/Launch";
import { Parties } from "./screens/Parties";
import { Personas } from "./screens/Personas";
import { Results } from "./screens/Results";
import { Settings } from "./screens/Settings";

export function App() {
  const [{ route, param }, nav] = useHashRoute();

  useEffect(() => {
    // Hydrate the party-color registry early so theme.partyColor() &c. can
    // resolve custom parties (libertarian, green, …) anywhere in the app.
    void api.listParties().then((r) => setPartyRegistry(r.parties));
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
    case "parties":
      Screen = <Parties nav={nav} param={param} />;
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
    case "settings":
      Screen = <Settings nav={nav} />;
      break;
    default:
      Screen = <Dashboard nav={nav} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar route={route} nav={nav} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div id="screen" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {Screen}
        </div>
        <DisclaimerBar />
      </div>
    </div>
  );
}
