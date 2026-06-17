import type { CSSProperties } from "react";

export const ICONS: Record<string, string> = {
  dashboard:
    "M3 13h7V3H3v10zm0 8h7v-6H3v6zm11 0h7V11h-7v10zm0-18v6h7V3h-7z",
  personas:
    "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM8 13a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 13zm0 2c-3 0-6 1.6-6 4v2h8M16 13c-3.3 0-7 1.8-7 4.5V20h14v-2.5c0-2.7-3.7-4.5-7-4.5z",
  launch: "M5 21V10l7-6 7 6v11M9 21v-6h6v6M3 10l9-7 9 7",
  chamber: "M3 20h18M5 20v-6m4 6v-6m6 6v-6m4 6v-6M3 11l9-6 9 6M3 11h18",
  results: "M4 20V9m5 11V4m5 16v-7m5 7V8",
  transcript: "M5 3h11l3 3v15H5zM9 9h7M9 13h7M9 17h4",
  graph:
    "M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm12 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7.5 6.5l3.2 9M16.5 6.5l-3.2 9M8 6h8",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4",
  close: "M6 6l12 12M18 6L6 18",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  chevL: "M15 6l-6 6 6 6",
  play: "M7 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  skip: "M5 5v14l8-7zM14 5v14l8-7z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 9 1.1V1a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H23a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  sliders: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5M14 4v4M6 10v4M11 16v4",
  scale:
    "M12 3v18M7 21h10M12 6l-6 2 3 5a3 3 0 0 1-6 0l3-5M12 6l6 2-3 5a3 3 0 0 0 6 0l-3-5M6 8l6-2 6 2",
  check: "M5 12l5 5L20 6",
  x: "M6 6l12 12M18 6L6 18",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  arrowR: "M5 12h14m0 0l-6-6m6 6l-6 6",
  arrowUp: "M12 19V5m0 0l-6 6m6-6l6 6",
  arrowDown: "M12 5v14m0 0l6-6m-6 6l-6-6",
  feather: "M20 4C12 4 5 11 5 19l-1 1M20 4c0 8-7 11-13 13M20 4l-6 8h-3",
  flag: "M5 21V4m0 0c3-2 6 2 9 0s5-2 5-2v9s-2 1-5 2-6-2-9 0",
  filter: "M3 5h18l-7 8v6l-4-2v-4z",
  copy: "M9 9h10v10H9zM5 15H4V5h10v1",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 4v4h-4",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6z",
  vote: "M9 11l3 3L22 4M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11",
  doc: "M7 3h7l4 4v14H7zM14 3v5h5",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  fill?: boolean;
  style?: CSSProperties;
}

export function Icon({ name, size = 18, stroke = 1.6, fill = false, style }: IconProps) {
  const d = ICONS[name] || "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto", ...style }}
    >
      <path d={d} />
    </svg>
  );
}
