/* ============================================================
   Revolution — design tokens & global stylesheet injector.
   Ported from prototype app/theme.jsx — palette and CSS variables
   are the single source of truth for the Bold Constitutional look.
   ============================================================ */

export const T = {
  // base / ink
  ink: "#0A1626",
  ink1: "#0E1E33",
  ink2: "#13273F",
  ink3: "#1B3553",
  inkLine: "#23405F",
  inkLineSoft: "#1A3149",

  // marble (light surfaces)
  marble: "#F4F0E6",
  marble2: "#EBE4D4",
  marbleLine: "#D9CFB8",

  // gold accents
  gold: "#C2A14D",
  goldBright: "#E2C36B",
  goldDeep: "#9A7C32",

  // text on ink
  txt: "#EEF3FA",
  txtMute: "#9DB0C8",
  txtFaint: "#5F7491",
  txtDim: "#67809D",

  // text on marble
  inkTxt: "#172234",
  inkTxtMute: "#5A6478",

  // party
  rep: "#C0392B",
  repBright: "#E05A4B",
  repDeep: "#8E2018",
  repWash: "rgba(192,57,43,0.12)",
  dem: "#2E5AA8",
  demBright: "#4D7FD6",
  demDeep: "#1C3D7A",
  demWash: "rgba(46,90,168,0.14)",

  // status
  support: "#3E9B6E",
  oppose: "#C0392B",
  abstain: "#9A8C6B",
  pass: "#3E9B6E",
  reject: "#C0392B",
} as const;

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Public+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Spline+Sans+Mono:wght@400;500;600&display=swap');

:root{
  --ink:${T.ink}; --ink1:${T.ink1}; --ink2:${T.ink2}; --ink3:${T.ink3};
  --ink-line:${T.inkLine}; --ink-line-soft:${T.inkLineSoft};
  --marble:${T.marble}; --marble2:${T.marble2}; --marble-line:${T.marbleLine};
  --gold:${T.gold}; --gold-bright:${T.goldBright}; --gold-deep:${T.goldDeep};
  --txt:${T.txt}; --txt-mute:${T.txtMute}; --txt-faint:${T.txtFaint}; --txt-dim:${T.txtDim};
  --ink-txt:${T.inkTxt}; --ink-txt-mute:${T.inkTxtMute};
  --rep:${T.rep}; --rep-bright:${T.repBright}; --rep-deep:${T.repDeep}; --rep-wash:${T.repWash};
  --dem:${T.dem}; --dem-bright:${T.demBright}; --dem-deep:${T.demDeep}; --dem-wash:${T.demWash};
  --support:${T.support}; --oppose:${T.oppose}; --abstain:${T.abstain};
  --pass:${T.pass}; --reject:${T.reject};

  --serif:'Newsreader', Georgia, 'Times New Roman', serif;
  --sans:'Public Sans', system-ui, -apple-system, sans-serif;
  --mono:'Spline Sans Mono', ui-monospace, monospace;

  --r-sm:6px; --r-md:10px; --r-lg:16px; --r-xl:22px;
  --shadow-1:0 1px 2px rgba(0,0,0,.4);
  --shadow-2:0 8px 30px rgba(0,0,0,.35);
  --shadow-pop:0 24px 70px rgba(0,0,0,.55);
}

*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  font-family:var(--sans);
  background:var(--ink);
  color:var(--txt);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
#root{min-height:100vh;}

.marble-bg{
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,.5), rgba(255,255,255,0) 45%),
    linear-gradient(160deg, ${T.marble} 0%, ${T.marble2} 100%);
}
.marble-veined{ position:relative; }
.marble-veined::after{
  content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background-image:
    linear-gradient(115deg, transparent 0 38%, rgba(120,105,70,.05) 38.5%, transparent 40%),
    linear-gradient(72deg, transparent 0 66%, rgba(120,105,70,.045) 66.4%, transparent 68%);
  mix-blend-mode:multiply;opacity:.7;
}

.ink-panel{
  background:linear-gradient(180deg, var(--ink2), var(--ink1));
  border:1px solid var(--ink-line);
  border-radius:var(--r-lg);
}

::selection{background:rgba(226,195,107,.3);}

*::-webkit-scrollbar{width:11px;height:11px;}
*::-webkit-scrollbar-track{background:transparent;}
*::-webkit-scrollbar-thumb{background:${T.inkLine};border-radius:20px;border:3px solid transparent;background-clip:padding-box;}
*::-webkit-scrollbar-thumb:hover{background:${T.ink3};background-clip:padding-box;}

.gold-rule{display:flex;align-items:center;gap:10px;color:var(--gold);}
.gold-rule::before,.gold-rule::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,transparent,var(--gold-deep),transparent);}

.eyebrow{
  font-family:var(--sans);font-weight:600;letter-spacing:.22em;text-transform:uppercase;
  font-size:11px;color:var(--gold);
}
.serif{font-family:var(--serif);}
.mono{font-family:var(--mono);}

a{color:inherit;text-decoration:none;}

@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
@keyframes pulse-seat{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
@keyframes rise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes fade{from{opacity:0;}to{opacity:1;}}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(226,195,107,.55);}100%{box-shadow:0 0 0 14px rgba(226,195,107,0);}}
@keyframes sweep{from{background-position:-200% 0;}to{background-position:200% 0;}}
.rise{animation:rise .45s cubic-bezier(.2,.7,.2,1) both;}
.fade{animation:fade .4s ease both;}

button{font-family:var(--sans);cursor:pointer;}
input,textarea,select{font-family:var(--sans);}
`;

export function injectGlobal(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("rev-global")) return;
  const s = document.createElement("style");
  s.id = "rev-global";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

// Process-wide cache of the party registry. App.tsx hydrates it on boot via
// setPartyRegistry(); every party color/label helper consults the cache first
// so custom parties carry their own visual identity instead of falling back to
// the Democrat blue.
interface RegistryEntry {
  id: string;
  label: string;
  color: string;
}

let PARTY_REGISTRY: RegistryEntry[] = [];

export function setPartyRegistry(parties: RegistryEntry[]): void {
  PARTY_REGISTRY = parties.map((p) => ({ id: p.id, label: p.label, color: p.color }));
}

function findParty(id: string): RegistryEntry | undefined {
  return PARTY_REGISTRY.find((p) => p.id === id);
}

/** Convert a hex color (#RRGGBB) to an rgba() string with the given alpha. */
function hexAlpha(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Brighten a hex color by mixing toward white. */
function brighten(hex: string, amount = 0.32): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `rgb(${r},${g},${b})`;
}

export function partyColor(party: string): string {
  if (party === "republican") return "var(--rep)";
  if (party === "democrat") return "var(--dem)";
  return findParty(party)?.color || "var(--gold)";
}

export function partyBright(party: string): string {
  if (party === "republican") return "var(--rep-bright)";
  if (party === "democrat") return "var(--dem-bright)";
  const base = findParty(party)?.color;
  return base ? brighten(base) : "var(--gold-bright)";
}

export function partyWash(party: string): string {
  if (party === "republican") return "var(--rep-wash)";
  if (party === "democrat") return "var(--dem-wash)";
  const base = findParty(party)?.color;
  return base ? hexAlpha(base, 0.14) : "rgba(194,161,77,0.12)";
}

export function partyLabel(party: string): string {
  if (party === "republican") return "Republican";
  if (party === "democrat") return "Democrat";
  return (
    findParty(party)?.label ||
    party.charAt(0).toUpperCase() + party.slice(1)
  );
}
