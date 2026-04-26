"""Base Agent class for political negotiation."""
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional

NegotiationPosture = Literal[
    "dealmaker",
    "hardliner",
    "pragmatist",
    "bomb_thrower",
    "institutionalist",
]


@dataclass
class Agent:
    """A political agent with a defined persona."""
    id: str
    name: str
    title: str
    party: Literal["republican", "democrat"]
    role: Literal["party_head", "advisor", "assistant"]
    specialty: str
    philosophy: str
    communication_style: str
    key_positions: list[str] = field(default_factory=list)
    red_lines: list[str] = field(default_factory=list)
    rhetorical_signatures: list[str] = field(default_factory=list)
    allies: list[str] = field(default_factory=list)
    rivals: list[str] = field(default_factory=list)
    negotiation_posture: NegotiationPosture = "pragmatist"
    constituency: str = ""

    @classmethod
    def from_json(cls, path: Path) -> "Agent":
        """Load an Agent from a JSON file."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(**data)

    def get_system_prompt(self, proposal_description: str, party_position: Optional[str] = None) -> str:
        """Generate the system prompt for this agent."""
        from .prompts import AGENT_SYSTEM_PROMPT

        positions_text = (
            "\n".join(f"- {pos}" for pos in self.key_positions)
            if self.key_positions else "Not specified"
        )
        red_lines_text = (
            "\n".join(f"- {line}" for line in self.red_lines)
            if self.red_lines else "None publicly declared"
        )
        signatures_text = (
            "\n".join(f"- {sig}" for sig in self.rhetorical_signatures)
            if self.rhetorical_signatures else "None recorded"
        )
        relationships_text = self._format_relationships()
        constituency_text = self.constituency or "Not specified"

        return AGENT_SYSTEM_PROMPT.format(
            agent_name=self.name,
            agent_title=self.title,
            agent_id=self.id,
            party=self.party.capitalize(),
            role_description=self._get_role_description(),
            negotiation_posture=self._get_posture_description(),
            constituency=constituency_text,
            philosophy=self.philosophy,
            specialty=self.specialty,
            communication_style=self.communication_style,
            rhetorical_signatures=signatures_text,
            key_positions=positions_text,
            red_lines=red_lines_text,
            relationships=relationships_text,
            proposal_description=proposal_description,
            party_position=party_position or "Not yet formed - you are helping to shape it"
        )

    def _get_role_description(self) -> str:
        """Get role-specific description."""
        descriptions = {
            "party_head": (
                "You are the LEADER of your party. You set the strategic direction, "
                "coordinate discussions among your team, synthesize member opinions into a unified position, "
                "and represent the party in cross-party debates. Your word carries significant weight. "
                "You must listen to your advisors and assistants, but ultimately you shape the party's official stance."
            ),
            "advisor": (
                "You are a SENIOR ADVISOR with deep expertise in your specialty area. "
                "You provide detailed analysis and strategic recommendations to the party head. "
                "Your opinion matters greatly in shaping the party's position. "
                "Be thorough in your analysis and consider multiple angles."
            ),
            "assistant": (
                "You are a POLICY ASSISTANT who supports the advisors with research, data analysis, "
                "and detailed policy information. You provide factual grounding for the party's arguments "
                "and help identify potential issues or opportunities. Be concise and data-driven."
            )
        }
        return descriptions.get(self.role, "")

    def _get_posture_description(self) -> str:
        """Get a one-line description of the agent's negotiation posture."""
        descriptions = {
            "dealmaker": (
                "Dealmaker: you actively seek cross-aisle compromise and propose concrete amendments "
                "to bring opponents on board."
            ),
            "hardliner": (
                "Hardliner: you defend your stated positions firmly and rarely concede ground; "
                "compromise must come to you, not the other way around."
            ),
            "pragmatist": (
                "Pragmatist: you weigh trade-offs and accept incremental wins where they advance your goals."
            ),
            "bomb_thrower": (
                "Bomb-thrower: you reject the framing of bad proposals outright, prefer scorched-earth "
                "rhetoric, and are willing to break with your own party's leadership."
            ),
            "institutionalist": (
                "Institutionalist: you respect process, party discipline, and the dignity of the chamber; "
                "you build consensus through procedure rather than confrontation."
            ),
        }
        return descriptions.get(self.negotiation_posture, descriptions["pragmatist"])

    def _format_relationships(self) -> str:
        """Format allies and rivals into a readable block."""
        parts = []
        if self.allies:
            parts.append("Allies (figures in this room you tend to align with): " + ", ".join(self.allies))
        if self.rivals:
            parts.append("Rivals (figures in this room you frequently clash with): " + ", ".join(self.rivals))
        if not parts:
            return "No notable in-room alignments."
        return "\n".join(parts)

    def get_voting_prompt(self, proposal_description: str, debate_summary: str) -> str:
        """Generate the prompt for voting phase."""
        from .prompts import VOTING_PROMPT

        return VOTING_PROMPT.format(
            agent_name=self.name,
            proposal_description=proposal_description,
            debate_summary=debate_summary
        )

    def __repr__(self) -> str:
        return f"Agent({self.id}, {self.name}, {self.party})"


def load_agents(directory: Path) -> list[Agent]:
    """Load every JSON agent file from the given directory, sorted by filename."""
    directory = Path(directory)
    if not directory.is_dir():
        raise FileNotFoundError(f"Agent data directory not found: {directory}")
    agents = [Agent.from_json(path) for path in sorted(directory.glob("*.json"))]
    if not agents:
        raise ValueError(f"No agent JSON files found in {directory}")
    return agents


def validate_relationships(agents: list[Agent]) -> None:
    """Raise ValueError if any allies/rivals reference IDs not present in the agent list."""
    known_ids = {agent.id for agent in agents}
    for agent in agents:
        unknown_allies = [aid for aid in agent.allies if aid not in known_ids]
        unknown_rivals = [rid for rid in agent.rivals if rid not in known_ids]
        if unknown_allies or unknown_rivals:
            raise ValueError(
                f"Agent '{agent.id}' references unknown ids -- "
                f"allies: {unknown_allies}, rivals: {unknown_rivals}"
            )
