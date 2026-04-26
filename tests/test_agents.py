"""Tests for the Agent dataclass, JSON loading, validation, and prompt rendering."""
import json
from pathlib import Path

import pytest

from src.agents.base import (
    Agent,
    load_agents,
    register_agents,
    validate_relationships,
)
from src.agents.democrat import DEMOCRAT_AGENTS
from src.agents.republican import REPUBLICAN_AGENTS


def _make_agent(**overrides) -> Agent:
    base = dict(
        id="test_agent",
        name="Test Agent",
        title="Test Title",
        party="republican",
        role="advisor",
        specialty="Testing",
        philosophy="I test things.",
        communication_style="Terse.",
    )
    base.update(overrides)
    return Agent(**base)


class TestLiteralValidation:
    def test_invalid_party_raises(self):
        with pytest.raises(ValueError, match="invalid party"):
            _make_agent(party="independent")

    def test_invalid_role_raises(self):
        with pytest.raises(ValueError, match="invalid role"):
            _make_agent(role="intern")

    def test_invalid_negotiation_posture_raises(self):
        with pytest.raises(ValueError, match="invalid negotiation_posture"):
            _make_agent(negotiation_posture="hardliiner")

    def test_default_posture_is_pragmatist(self):
        agent = _make_agent()
        assert agent.negotiation_posture == "pragmatist"


class TestValidateRelationships:
    def test_unknown_ally_id_raises(self):
        agents = [_make_agent(id="a", allies=["nonexistent"])]
        with pytest.raises(ValueError, match="unknown ids"):
            validate_relationships(agents)

    def test_unknown_rival_id_raises(self):
        agents = [_make_agent(id="a", rivals=["nope"])]
        with pytest.raises(ValueError, match="unknown ids"):
            validate_relationships(agents)

    def test_self_reference_in_allies_raises(self):
        agents = [_make_agent(id="a", allies=["a"])]
        with pytest.raises(ValueError, match="lists itself"):
            validate_relationships(agents)

    def test_self_reference_in_rivals_raises(self):
        agents = [_make_agent(id="a", rivals=["a"])]
        with pytest.raises(ValueError, match="lists itself"):
            validate_relationships(agents)

    def test_cross_party_ally_raises(self):
        agents = [
            _make_agent(id="r", party="republican", allies=["d"]),
            _make_agent(id="d", party="democrat"),
        ]
        with pytest.raises(ValueError, match="cross-party"):
            validate_relationships(agents)

    def test_valid_in_party_relationships_pass(self):
        agents = [
            _make_agent(id="a", party="republican", allies=["b"], rivals=[]),
            _make_agent(id="b", party="republican"),
        ]
        validate_relationships(agents)


class TestFromJson:
    def test_round_trip(self, tmp_path: Path):
        data = {
            "id": "rt",
            "name": "Round Trip",
            "title": "Tester",
            "party": "democrat",
            "role": "advisor",
            "specialty": "JSON",
            "philosophy": "Persisted state.",
            "communication_style": "Structured.",
            "negotiation_posture": "dealmaker",
            "constituency": "Test suite",
        }
        path = tmp_path / "rt.json"
        path.write_text(json.dumps(data))
        agent = Agent.from_json(path)
        assert agent.id == "rt"
        assert agent.negotiation_posture == "dealmaker"

    def test_load_agents_sorts_by_id(self, tmp_path: Path):
        for agent_id in ("zeta", "alpha", "mu"):
            (tmp_path / f"x_{agent_id}.json").write_text(
                json.dumps(_make_agent(id=agent_id).__dict__)
            )
        loaded = load_agents(tmp_path)
        assert [a.id for a in loaded] == ["alpha", "mu", "zeta"]

    def test_load_agents_empty_dir_raises(self, tmp_path: Path):
        with pytest.raises(ValueError, match="No agent JSON files"):
            load_agents(tmp_path)

    def test_load_agents_missing_dir_raises(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError):
            load_agents(tmp_path / "does_not_exist")


class TestProductionAgents:
    def test_eleven_per_party(self):
        assert len(REPUBLICAN_AGENTS) == 11
        assert len(DEMOCRAT_AGENTS) == 11

    def test_all_ids_unique(self):
        all_ids = [a.id for a in REPUBLICAN_AGENTS + DEMOCRAT_AGENTS]
        assert len(all_ids) == len(set(all_ids))

    def test_relationships_resolve_to_names_in_prompt(self):
        speaker = next(a for a in REPUBLICAN_AGENTS if a.id == "rep_head")
        prompt = speaker.get_system_prompt("Test proposal.")
        for ally_id in speaker.allies:
            ally = next(a for a in REPUBLICAN_AGENTS if a.id == ally_id)
            assert ally.name in prompt, f"Expected {ally.name} in resolved prompt"
            assert ally_id not in prompt, f"Raw id {ally_id} leaked into prompt"

    def test_prompt_contains_new_sections(self):
        speaker = next(a for a in REPUBLICAN_AGENTS if a.id == "rep_head")
        prompt = speaker.get_system_prompt("Test proposal.")
        for header in (
            "## Your Negotiation Posture",
            "## Who You Answer To",
            "## Your Red Lines",
            "## Your Relationships in This Room",
        ):
            assert header in prompt

    def test_prompt_renders_for_every_agent(self):
        for agent in REPUBLICAN_AGENTS + DEMOCRAT_AGENTS:
            prompt = agent.get_system_prompt("Test proposal.", "Party position TBD.")
            assert agent.name in prompt
            assert agent.philosophy[:40] in prompt


class TestRegistry:
    def test_registry_resolves_unknown_ids_to_themselves(self):
        register_agents([])
        agent = _make_agent(
            id="solo", party="republican", allies=["ghost"]
        )
        text = agent._format_relationships()
        assert "ghost" in text
