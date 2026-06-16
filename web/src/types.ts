/* Shared client types — mirror server/db.py + API_SPEC.md. */

export type Party = "republican" | "democrat" | string;
export type Role = "party_head" | "advisor" | "assistant";
export type NegotiationPosture =
  | "dealmaker"
  | "hardliner"
  | "pragmatist"
  | "bomb_thrower"
  | "institutionalist";
export type VoteValue = "support" | "oppose" | "abstain";
export type DebateStatus =
  | "pending"
  | "running"
  | "voting"
  | "passed"
  | "rejected"
  | "amended"
  | "error";

export interface Source {
  title: string;
  url: string;
  date: string;
  source_type: string;
  description?: string;
}

export interface PersonaSummary {
  id: string;
  name: string;
  title: string;
  party: Party;
  role: Role;
  specialty: string;
  negotiation_posture: NegotiationPosture;
  persona_last_updated: string;
}

export interface Persona extends PersonaSummary {
  philosophy: string;
  communication_style: string;
  key_positions: string[];
  red_lines: string[];
  rhetorical_signatures: string[];
  allies: string[];
  rivals: string[];
  constituency: string;
  personality_assessment?: string;
  sources?: Source[];
}

export interface PartyEntry {
  id: string;
  label: string;
  color: string;
  seats: number;
}

export interface RelationshipNode {
  id: string;
  name: string;
  party: Party;
  role: Role;
}

export interface RelationshipEdge {
  from: string;
  to: string;
  type: "ally" | "rival";
}

export interface RelationshipGraph {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

export interface DebateSummary {
  id: string;
  title: string;
  status: DebateStatus | "passed" | "rejected";
  rounds: number;
  support: number;
  oppose: number;
  abstain: number;
  amendments: number;
  model: string;
  temperature: number;
  duration_s: number;
  created_at: string;
}

export interface Turn {
  id: string;
  agent: string;
  party: Party;
  role: Role;
  phase:
    | "intro"
    | "advisor_discussion"
    | "assistant_research"
    | "synthesis"
    | "cross_party_debate"
    | "advisor"
    | "research"
    | "debate";
  round: number | null;
  content: string;
  ts?: string;
}

export interface VoteRecord {
  agent: string;
  party: Party;
  role?: Role;
  vote: VoteValue;
  reasoning: string;
  changed: boolean;
  from?: VoteValue | null;
  amendments?: string[];
}

export interface Amendment {
  id: string;
  text: string;
  by: string;
  status: "proposed" | "accepted" | "contested" | "rejected";
}
