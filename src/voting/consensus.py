"""Voting and consensus logic."""
from dataclasses import dataclass, field

from ..state.types import Vote


@dataclass
class VotingResult:
    """Result of the final vote.

    R2-C generalized this for N parties. The dict-keyed `by_party` field is
    the canonical source for N-party tallies; the per-party scalar fields
    (`republican_*`, `democrat_*`) are still populated when those parties
    appear so the CLI display, exports, and M1–M5 tests don't need rewriting.
    """
    total_support: int
    total_oppose: int
    total_abstain: int
    republican_support: int
    republican_oppose: int
    republican_abstain: int
    democrat_support: int
    democrat_oppose: int
    democrat_abstain: int
    passed: bool
    bipartisan: bool
    margin: str
    by_party: dict[str, dict[str, int]] = field(default_factory=dict)

    def __str__(self) -> str:
        status = "PASSED" if self.passed else "REJECTED"
        bipartisan_str = " (Bipartisan)" if self.bipartisan else ""
        return f"{status}{bipartisan_str} - {self.margin}"


def calculate_party_result(votes: list[Vote]) -> dict[str, int]:
    """Calculate vote counts for a party.

    Args:
        votes: List of Vote objects from a party

    Returns:
        Dict with counts for support, oppose, abstain
    """
    result = {"support": 0, "oppose": 0, "abstain": 0}
    for vote in votes:
        result[vote.vote] += 1
    return result


def determine_final_result(
    votes_by_party: dict[str, list[Vote]],
    threshold: float = 0.5,
) -> VotingResult:
    """Determine if proposal passes based on overall majority across all parties.

    Args:
        votes_by_party: Per-party vote lists keyed by party id.
        threshold: Percentage needed to pass (default 50%).

    Returns:
        VotingResult with full breakdown. Per-party scalars on the result are
        populated only for parties whose ids match (`republican`, `democrat`);
        the canonical N-party data lives in `result.by_party`.
    """
    by_party: dict[str, dict[str, int]] = {
        party: calculate_party_result(votes) for party, votes in votes_by_party.items()
    }

    total_support = sum(p["support"] for p in by_party.values())
    total_oppose = sum(p["oppose"] for p in by_party.values())
    total_abstain = sum(p["abstain"] for p in by_party.values())

    decisive = total_support + total_oppose
    passed = (total_support / decisive) > threshold if decisive > 0 else False

    # Bipartisan = at least two distinct parties contributed at least one
    # support vote each. Generalizes the old D+R definition to N parties.
    supporting_parties = [p for p, counts in by_party.items() if counts["support"] > 0]
    bipartisan = len(supporting_parties) >= 2

    margin = f"{total_support}-{total_oppose}"
    if total_abstain > 0:
        margin += f" ({total_abstain} abstention{'s' if total_abstain > 1 else ''})"

    rep = by_party.get("republican", {"support": 0, "oppose": 0, "abstain": 0})
    dem = by_party.get("democrat", {"support": 0, "oppose": 0, "abstain": 0})

    return VotingResult(
        total_support=total_support,
        total_oppose=total_oppose,
        total_abstain=total_abstain,
        republican_support=rep["support"],
        republican_oppose=rep["oppose"],
        republican_abstain=rep["abstain"],
        democrat_support=dem["support"],
        democrat_oppose=dem["oppose"],
        democrat_abstain=dem["abstain"],
        passed=passed,
        bipartisan=bipartisan,
        margin=margin,
        by_party=by_party,
    )


def determine_final_result_two_party(
    republican_votes: list[Vote],
    democrat_votes: list[Vote],
    threshold: float = 0.5,
) -> VotingResult:
    """Back-compat wrapper for the original two-party signature.

    Pre-R2-C code (CLI, server engine, tests) used to call
    `determine_final_result(rep_votes, dem_votes)`. The N-party rewrite
    moved to a dict-keyed signature; this helper keeps the old shape valid.
    """
    return determine_final_result(
        {"republican": republican_votes, "democrat": democrat_votes},
        threshold=threshold,
    )


def get_vote_summary(votes: list[Vote], party: str) -> str:
    """Get a formatted summary of votes for a party.

    Args:
        votes: List of Vote objects
        party: Party name for header

    Returns:
        Formatted string with vote breakdown
    """
    lines = [f"\n{party.upper()} PARTY VOTES:"]
    lines.append("-" * 40)

    for vote in sorted(votes, key=lambda v: (v.agent_role != "party_head", v.agent_role != "advisor", v.agent_id)):
        vote_symbol = {
            "support": "YES",
            "oppose": "NO",
            "abstain": "---"
        }[vote.vote]

        lines.append(f"  {vote.agent_name:30} {vote_symbol}")
        if vote.reasoning:
            # Truncate reasoning for display
            reasoning = vote.reasoning[:100] + "..." if len(vote.reasoning) > 100 else vote.reasoning
            lines.append(f"    Reason: {reasoning}")

    result = calculate_party_result(votes)
    lines.append("-" * 40)
    lines.append(f"  TOTAL: {result['support']} Support | {result['oppose']} Oppose | {result['abstain']} Abstain")

    return "\n".join(lines)
