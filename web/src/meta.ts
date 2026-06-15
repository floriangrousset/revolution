/* Client-side lookup tables — labels, glyphs, descriptions for enums.
   Lifted from prototype app/data.jsx (POSTURE_META, ROLE_META). */

import type { NegotiationPosture, Role } from "./types";

export const POSTURE_META: Record<
  NegotiationPosture,
  { label: string; glyph: string; desc: string }
> = {
  dealmaker: {
    label: "Dealmaker",
    glyph: "⇄",
    desc: "Seeks cross-aisle compromise and proposes concrete amendments.",
  },
  hardliner: {
    label: "Hardliner",
    glyph: "▌",
    desc: "Defends positions firmly and rarely concedes ground.",
  },
  pragmatist: {
    label: "Pragmatist",
    glyph: "≈",
    desc: "Weighs trade-offs and accepts incremental wins.",
  },
  bomb_thrower: {
    label: "Bomb-thrower",
    glyph: "✸",
    desc: "Rejects bad framing outright; will break with leadership.",
  },
  institutionalist: {
    label: "Institutionalist",
    glyph: "⚖",
    desc: "Respects process and party discipline; builds consensus by procedure.",
  },
};

export const ROLE_META: Record<Role, { label: string; rank: number; blurb: string }> = {
  party_head: {
    label: "Party Head",
    rank: 0,
    blurb: "Sets strategy, synthesizes the caucus position, and leads cross-party debate.",
  },
  advisor: {
    label: "Senior Advisor",
    rank: 1,
    blurb: "Deep subject expertise; shapes the party position with detailed analysis.",
  },
  assistant: {
    label: "Policy Assistant",
    rank: 2,
    blurb: "Provides research, data, and factual grounding for the party's case.",
  },
};
