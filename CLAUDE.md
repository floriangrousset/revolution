# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the negotiation system
python -m src.main
# Or, after `pip install -e .`:
revolution

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env

# Tests, lint, type-check (dev extras: pip install -e ".[dev]")
pytest
ruff check .
mypy src

# Pre-commit hooks (runs ruff --fix on each commit)
pip install pre-commit && pre-commit install
```

## Architecture

Revolution is a multi-agent political negotiation system using LangGraph for orchestration and Claude for reasoning. 22 AI agents (11 per party) debate and vote on user-submitted proposals.

### LangGraph Structure

**Main Graph** (`src/graphs/main_graph.py`):
```
START → receive_proposal → republican_deliberation → democrat_deliberation
      → cross_party_debate → [conditional: continue/vote] → final_voting → resolution → END
```

**Party Subgraph** (`src/graphs/party_graph.py`):
```
START → party_head_intro → advisor_discussion → assistant_research → form_position → END
```

### State Management

Two TypedDict states in `src/state/types.py`:
- **NegotiationState**: Main orchestration state (proposal, positions, votes, phase)
- **PartyState**: Party deliberation state (discussion, party_position, member_votes)

Custom reducers `add_messages` and `add_votes` handle state accumulation. The `add_votes` reducer allows agents to change their vote (keyed by agent_id).

### Agent System

Agent personas live as JSON files in `src/agents/data/{republican,democrat}/` (11 per party).
`src/agents/republican.py` and `src/agents/democrat.py` are thin loaders that call
`load_agents()` → `validate_relationships()` → `register_agents()` from `src/agents/base.py`.
To add or edit a persona, edit the JSON, not the Python.

Each agent has:
- Role hierarchy: `party_head` → `advisor` → `assistant`
- Philosophy, communication style, specialty
- Optional `Source` entries (citations) — validated strictly at load time;
  malformed sources raise rather than being silently dropped.

System prompts generated via `Agent.get_system_prompt()` in `src/agents/base.py`, templates in `src/agents/prompts.py`.

### Node Implementation

All graph node implementations in `src/graphs/nodes.py`. Function names sometimes differ
from the registered graph-node names used in the flow diagrams above:
- `party_head_intro`, `advisor_discussion`, `assistant_research`, `form_party_position` (registered as `form_position`) — party deliberation
- `cross_party_debate` — cross-party interaction
- `conduct_voting` (registered as `final_voting`) — final voting with vote parsing

Nodes accept optional `display_callback` for real-time CLI output.

### Display System

`src/cli/display.py` uses Rich library with party-colored panels (red=Republican, blue=Democrat). The `NegotiationDisplay.display_callback()` method is passed to graph nodes.

### Voting & Result

`src/voting/consensus.py` aggregates votes into a `VotingResult` (per-party tallies, `passed`, `bipartisan`, `margin`). Called from `main.py` after the graph completes.

## Key Patterns

- Graphs built with `StateGraph(TypedDict)` and compiled via `builder.compile()`
- Async execution: `await graph.ainvoke(initial_state)`
- All LLM calls use `ChatAnthropic` from langchain-anthropic
- Model configured via `MODEL_NAME` env var (default: `claude-opus-4-5-20250514`, see `src/graphs/nodes.py`)
- Requires Python 3.11+
