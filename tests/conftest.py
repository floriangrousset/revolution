"""Pytest fixtures for the test suite."""
import os

# Force the agent loader to use the bundled `src/agents/data/<party>/` set
# regardless of what the developer has saved into `data/personas/` via the
# Persona Manager. Has to land in env BEFORE any agent module imports.
os.environ.setdefault("REVOLUTION_USE_BUNDLED_PERSONAS", "1")

import pytest  # noqa: E402

from src.agents.base import _AGENT_REGISTRY  # noqa: E402


@pytest.fixture(autouse=True)
def snapshot_registry():
    """Snapshot _AGENT_REGISTRY before each test and restore it after.

    Production agents (REPUBLICAN_AGENTS, DEMOCRAT_AGENTS) register themselves
    at import time. This fixture preserves those registrations across tests
    while isolating any per-test mutations.
    """
    saved = dict(_AGENT_REGISTRY)
    yield
    _AGENT_REGISTRY.clear()
    _AGENT_REGISTRY.update(saved)
