"""Pytest fixtures for the test suite."""
import pytest

from src.agents.base import _AGENT_REGISTRY


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
