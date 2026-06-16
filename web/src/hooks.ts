import { useEffect, useState } from "react";

export interface Route {
  route: string;
  param?: string;
}

/** Subscribe to viewport width so components can swap layouts on the fly. */
export function useWindowWidth(): number {
  const [w, setW] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth,
  );
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

function parseHash(): Route {
  const h = (location.hash || "#/dashboard").replace(/^#\//, "");
  const [route, param] = h.split("/");
  return { route: route || "dashboard", param: param || undefined };
}

export function useHashRoute(): [Route, (route: string, param?: string) => void] {
  const [r, setR] = useState<Route>(parseHash);
  useEffect(() => {
    const on = () => setR(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = (route: string, param?: string) => {
    location.hash = "#/" + route + (param ? "/" + param : "");
    const el = document.getElementById("screen");
    if (el) el.scrollTop = 0;
  };
  return [r, nav];
}
