"""Republican Party agent definitions, loaded from JSON."""
from pathlib import Path

from .base import load_agents, validate_relationships

_DATA_DIR = Path(__file__).parent / "data" / "republican"

REPUBLICAN_AGENTS = load_agents(_DATA_DIR)
validate_relationships(REPUBLICAN_AGENTS)
