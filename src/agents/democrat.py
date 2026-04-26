"""Democrat Party agent definitions, loaded from JSON."""
from pathlib import Path

from .base import load_agents, register_agents, validate_relationships

_DATA_DIR = Path(__file__).parent / "data" / "democrat"

DEMOCRAT_AGENTS = load_agents(_DATA_DIR)
validate_relationships(DEMOCRAT_AGENTS)
register_agents(DEMOCRAT_AGENTS)
