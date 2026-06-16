"""Democratic Party agent definitions.

R2-C: this module is now a thin compatibility shim over the generic
`loader.load_party_agents` API. `DEMOCRAT_AGENTS` is preserved so legacy
callers and tests that import it directly keep working.
"""
from .loader import load_party_agents

DEMOCRAT_AGENTS = load_party_agents("democrat")
