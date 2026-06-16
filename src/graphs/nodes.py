"""Node implementations for the negotiation graphs."""
import os
from contextvars import ContextVar
from typing import Any, Literal
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from pydantic import SecretStr

from ..state.types import PartyState, NegotiationState, AgentMessage, Vote
from ..agents.base import Agent
from ..agents.republican import REPUBLICAN_AGENTS
from ..agents.democrat import DEMOCRAT_AGENTS
from ..agents.prompts import (
    PARTY_HEAD_INTRO_PROMPT,
    ADVISOR_ANALYSIS_PROMPT,
    ASSISTANT_RESEARCH_PROMPT,
    SYNTHESIS_PROMPT,
    DEBATE_OPENING_PROMPT,
    DEBATE_REBUTTAL_PROMPT,
)

# Per-run overrides for model and temperature. The CLI never touches these, so
# they fall back to env / default. The FastAPI debate runner sets them before
# kicking off `run_negotiation` so each debate honors the Launch screen's knobs
# without rewriting every node signature.
_model_override: ContextVar[str | None] = ContextVar("_model_override", default=None)
_temperature_override: ContextVar[float | None] = ContextVar(
    "_temperature_override", default=None
)


def set_model_overrides(*, model: str | None = None, temperature: float | None = None) -> None:
    """Bind model/temperature for the current async task only."""
    _model_override.set(model)
    _temperature_override.set(temperature)


def _content_text(response: BaseMessage) -> str:
    """Narrow a chat-model response's content to a string.

    `BaseMessage.content` is typed `str | list[...]` to support multimodal
    payloads, but our text-only ChatAnthropic calls always return str.
    Asserting here keeps every call site simply typed.
    """
    content = response.content
    if isinstance(content, str):
        return content
    raise TypeError(
        f"Expected str content from model, got {type(content).__name__}"
    )


def get_model() -> ChatAnthropic:
    """Create the Claude model instance.

    Resolution order: per-run contextvar override → env var → default. Caller
    can pin `model`/`temperature` per debate via `set_model_overrides()`.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY") or ""
    model_name = (
        _model_override.get()
        or os.environ.get("MODEL_NAME")
        or "claude-sonnet-4-6"
    )
    temperature = _temperature_override.get()
    if temperature is None:
        temperature = 0.8
    return ChatAnthropic(
        model_name=model_name,
        api_key=SecretStr(api_key),
        max_tokens_to_sample=2048,
        temperature=temperature,
        timeout=None,
        stop=None,
    )


def get_agents_by_party(party: str) -> list[Agent]:
    """Get all agents for a party."""
    if party == "republican":
        return REPUBLICAN_AGENTS
    return DEMOCRAT_AGENTS


def get_party_head(party: str) -> Agent:
    """Get the party head agent."""
    agents = get_agents_by_party(party)
    return next(a for a in agents if a.role == "party_head")


def get_advisors(party: str) -> list[Agent]:
    """Get all advisor agents for a party."""
    agents = get_agents_by_party(party)
    return [a for a in agents if a.role == "advisor"]


def get_assistants(party: str) -> list[Agent]:
    """Get all assistant agents for a party."""
    agents = get_agents_by_party(party)
    return [a for a in agents if a.role == "assistant"]


def format_discussion(messages: list[AgentMessage]) -> str:
    """Format discussion messages for prompt context."""
    if not messages:
        return "No discussion yet."

    formatted = []
    for msg in messages:
        formatted.append(f"**[{msg.agent_id}] {msg.agent_name} ({msg.role}):**\n{msg.content}\n")
    return "\n".join(formatted)


# ============================================================================
# Party Deliberation Nodes
# ============================================================================

async def party_head_intro(state: PartyState, display_callback=None) -> dict[str, Any]:
    """Party head introduces the proposal and sets the agenda."""
    party = state["party_name"]
    head = get_party_head(party)
    model = get_model()

    prompt = PARTY_HEAD_INTRO_PROMPT.format(
        proposal_description=state["proposal"].description,
        party=party.capitalize()
    )

    system_prompt = head.get_system_prompt(state["proposal"].description)

    response = await model.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])

    message = AgentMessage(
        agent_id=head.id,
        agent_name=head.name,
        party=party,
        role=head.role,
        content=_content_text(response),
        phase="intro"
    )

    if display_callback:
        display_callback(message)

    return {
        "discussion": [message],
        "phase": "advisor_discussion"
    }


async def advisor_discussion(state: PartyState, display_callback=None) -> dict[str, Any]:
    """Each advisor analyzes the proposal from their expertise."""
    party = state["party_name"]
    advisors = get_advisors(party)
    model = get_model()

    # Get leader's intro
    leader_intro = ""
    for msg in state["discussion"]:
        if msg.phase == "intro":
            leader_intro = msg.content
            break

    new_messages = []

    for advisor in advisors:
        prompt = ADVISOR_ANALYSIS_PROMPT.format(
            proposal_description=state["proposal"].description,
            leader_intro=leader_intro,
            previous_discussion=format_discussion(state["discussion"]),
            agent_name=advisor.name,
            agent_title=advisor.title,
            specialty=advisor.specialty
        )

        system_prompt = advisor.get_system_prompt(state["proposal"].description)

        response = await model.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ])

        message = AgentMessage(
            agent_id=advisor.id,
            agent_name=advisor.name,
            party=party,
            role=advisor.role,
            content=_content_text(response),
            phase="advisor_discussion"
        )

        new_messages.append(message)

        if display_callback:
            display_callback(message)

    return {
        "discussion": new_messages,
        "phase": "assistant_research"
    }


async def assistant_research(state: PartyState, display_callback=None) -> dict[str, Any]:
    """Assistants provide supporting research and data."""
    party = state["party_name"]
    assistants = get_assistants(party)
    model = get_model()

    new_messages = []

    for assistant in assistants:
        prompt = ASSISTANT_RESEARCH_PROMPT.format(
            proposal_description=state["proposal"].description,
            discussion=format_discussion(state["discussion"]),
            agent_name=assistant.name,
            agent_title=assistant.title,
            specialty=assistant.specialty
        )

        system_prompt = assistant.get_system_prompt(state["proposal"].description)

        response = await model.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ])

        message = AgentMessage(
            agent_id=assistant.id,
            agent_name=assistant.name,
            party=party,
            role=assistant.role,
            content=_content_text(response),
            phase="assistant_research"
        )

        new_messages.append(message)

        if display_callback:
            display_callback(message)

    return {
        "discussion": new_messages,
        "phase": "synthesis"
    }


async def form_party_position(state: PartyState, display_callback=None) -> dict[str, Any]:
    """Party head synthesizes discussion into official party position."""
    party = state["party_name"]
    head = get_party_head(party)
    model = get_model()

    prompt = SYNTHESIS_PROMPT.format(
        party=party.capitalize(),
        proposal_description=state["proposal"].description,
        full_discussion=format_discussion(state["discussion"])
    )

    system_prompt = head.get_system_prompt(state["proposal"].description)

    response = await model.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])

    message = AgentMessage(
        agent_id=head.id,
        agent_name=head.name,
        party=party,
        role=head.role,
        content=_content_text(response),
        phase="synthesis"
    )

    if display_callback:
        display_callback(message)

    return {
        "discussion": [message],
        "party_position": _content_text(response),
        "phase": "voting"
    }


# ============================================================================
# Cross-Party Debate Nodes
# ============================================================================

async def cross_party_debate(state: NegotiationState, display_callback=None) -> dict[str, Any]:
    """Conduct cross-party debate between party heads and advisors.

    On round 0 the heads use the opening prompt. On subsequent rounds they
    rebut the accumulated transcript from prior rounds so the debate builds
    on itself rather than restarting each round.
    """
    model = get_model()

    rep_head = get_party_head("republican")
    dem_head = get_party_head("democrat")

    current_round = state["negotiation_round"]
    is_opening_round = current_round == 0
    prior_transcript = format_discussion(state.get("debate_transcript", []))

    debate_messages = []

    # Republican head speaks
    if is_opening_round:
        rep_head_prompt = DEBATE_OPENING_PROMPT.format(
            proposal_description=state["proposal"].description,
            own_position=state["republican_position"] or "Not yet formed",
            opposing_position=state["democrat_position"] or "Not yet formed",
            round_number=current_round + 1,
            max_rounds=state["max_rounds"],
            agent_name=rep_head.name
        )
    else:
        rep_head_prompt = DEBATE_REBUTTAL_PROMPT.format(
            proposal_description=state["proposal"].description,
            debate_transcript=prior_transcript,
            agent_name=rep_head.name
        )

    rep_response = await model.ainvoke([
        SystemMessage(content=rep_head.get_system_prompt(state["proposal"].description, state["republican_position"])),
        HumanMessage(content=rep_head_prompt)
    ])

    rep_msg = AgentMessage(
        agent_id=rep_head.id,
        agent_name=rep_head.name,
        party="republican",
        role=rep_head.role,
        content=_content_text(rep_response),
        phase="cross_party_debate"
    )
    debate_messages.append(rep_msg)
    if display_callback:
        display_callback(rep_msg)

    # Democrat head responds (always sees the just-spoken Republican turn,
    # plus prior rounds if any)
    dem_context = format_discussion(
        list(state.get("debate_transcript", [])) + debate_messages
    )
    if is_opening_round:
        dem_head_prompt = DEBATE_OPENING_PROMPT.format(
            proposal_description=state["proposal"].description,
            own_position=state["democrat_position"] or "Not yet formed",
            opposing_position=state["republican_position"] or "Not yet formed",
            round_number=current_round + 1,
            max_rounds=state["max_rounds"],
            agent_name=dem_head.name
        )
    else:
        dem_head_prompt = DEBATE_REBUTTAL_PROMPT.format(
            proposal_description=state["proposal"].description,
            debate_transcript=dem_context,
            agent_name=dem_head.name
        )

    dem_response = await model.ainvoke([
        SystemMessage(content=dem_head.get_system_prompt(state["proposal"].description, state["democrat_position"])),
        HumanMessage(content=dem_head_prompt)
    ])

    dem_msg = AgentMessage(
        agent_id=dem_head.id,
        agent_name=dem_head.name,
        party="democrat",
        role=dem_head.role,
        content=_content_text(dem_response),
        phase="cross_party_debate"
    )
    debate_messages.append(dem_msg)
    if display_callback:
        display_callback(dem_msg)

    # Advisor rebuttals (one from each party)
    rep_advisors = get_advisors("republican")
    dem_advisors = get_advisors("democrat")

    for rep_adv, dem_adv in zip(rep_advisors[:2], dem_advisors[:2]):  # Just first 2 advisors each
        debate_so_far = format_discussion(
            list(state.get("debate_transcript", [])) + debate_messages
        )

        # Republican advisor rebuttal
        rep_rebuttal_prompt = DEBATE_REBUTTAL_PROMPT.format(
            proposal_description=state["proposal"].description,
            debate_transcript=debate_so_far,
            agent_name=rep_adv.name
        )

        rep_adv_response = await model.ainvoke([
            SystemMessage(content=rep_adv.get_system_prompt(state["proposal"].description, state["republican_position"])),
            HumanMessage(content=rep_rebuttal_prompt)
        ])

        rep_adv_msg = AgentMessage(
            agent_id=rep_adv.id,
            agent_name=rep_adv.name,
            party="republican",
            role=rep_adv.role,
            content=_content_text(rep_adv_response),
            phase="cross_party_debate"
        )
        debate_messages.append(rep_adv_msg)
        if display_callback:
            display_callback(rep_adv_msg)

        # Democrat advisor rebuttal
        debate_so_far = format_discussion(
            list(state.get("debate_transcript", [])) + debate_messages
        )
        dem_rebuttal_prompt = DEBATE_REBUTTAL_PROMPT.format(
            proposal_description=state["proposal"].description,
            debate_transcript=debate_so_far,
            agent_name=dem_adv.name
        )

        dem_adv_response = await model.ainvoke([
            SystemMessage(content=dem_adv.get_system_prompt(state["proposal"].description, state["democrat_position"])),
            HumanMessage(content=dem_rebuttal_prompt)
        ])

        dem_adv_msg = AgentMessage(
            agent_id=dem_adv.id,
            agent_name=dem_adv.name,
            party="democrat",
            role=dem_adv.role,
            content=_content_text(dem_adv_response),
            phase="cross_party_debate"
        )
        debate_messages.append(dem_adv_msg)
        if display_callback:
            display_callback(dem_adv_msg)

    return {
        "debate_transcript": debate_messages,
        "negotiation_round": state["negotiation_round"] + 1
    }


# ============================================================================
# Voting Nodes
# ============================================================================

async def initial_voting(state: NegotiationState, display_callback=None) -> dict[str, Any]:
    """Agents cast a tentative vote based ONLY on their party's synthesized position,
    before the cross-party debate. Pairs with the final `conduct_voting` to expose
    the persuasion mechanic — agents whose minds change between these two passes
    populate the Persuasion Timeline on the Results page.

    Kept lighter than `conduct_voting`: shorter prompt, no amendment proposals, and
    agents within a party are dispatched in parallel via `asyncio.gather` so the
    extra LLM pass adds ~30–60 s rather than minutes."""
    import asyncio
    model = get_model()

    republican_votes: list[Vote] = []
    democrat_votes: list[Vote] = []

    parties: list[tuple[Literal["republican", "democrat"], list[Vote]]] = [
        ("republican", republican_votes),
        ("democrat", democrat_votes),
    ]
    for party, votes_list in parties:
        agents = get_agents_by_party(party)
        party_position = (
            state["republican_position"] if party == "republican" else state["democrat_position"]
        ) or ""

        async def cast_initial(agent: Agent, p: Literal["republican", "democrat"] = party,
                               position: str = party_position) -> Vote:
            initial_prompt = (
                f"PROPOSAL UNDER CONSIDERATION:\n{state['proposal'].description}\n\n"
                f"YOUR PARTY'S SYNTHESIZED POSITION:\n{position}\n\n"
                "Before the cross-party debate begins, give your INITIAL vote based on your "
                "convictions and your party's stated position alone. You have not yet heard "
                "the opposing party's argument.\n\n"
                "Reply in this EXACT format on two lines and nothing else:\n"
                "VOTE: SUPPORT (or OPPOSE or ABSTAIN)\n"
                "REASONING: One sentence stating your initial stance.\n"
            )
            response = await model.ainvoke([
                SystemMessage(content=agent.get_system_prompt(state["proposal"].description, position)),
                HumanMessage(content=initial_prompt),
            ])
            return parse_vote(_content_text(response), agent, p)

        # Fan out the per-agent LLM calls within a party.
        cast_votes = await asyncio.gather(*(cast_initial(a) for a in agents))
        votes_list.extend(cast_votes)
        # Emit in stable order so the SSE feed mirrors the seating order.
        if display_callback:
            for vote in cast_votes:
                display_callback(vote)

    return {
        "republican_votes": republican_votes,
        "democrat_votes": democrat_votes,
        "phase": "cross_party_debate",
    }


async def conduct_voting(state: NegotiationState, display_callback=None) -> dict[str, Any]:
    """All agents cast their votes."""
    model = get_model()

    # Prepare debate summary
    debate_summary = format_discussion(state.get("debate_transcript", []))

    republican_votes: list[Vote] = []
    democrat_votes: list[Vote] = []

    # Vote all agents
    parties: list[tuple[Literal["republican", "democrat"], list[Vote]]] = [
        ("republican", republican_votes),
        ("democrat", democrat_votes),
    ]
    for party, votes_list in parties:
        agents = get_agents_by_party(party)
        party_position = (
            state["republican_position"] if party == "republican" else state["democrat_position"]
        ) or ""

        for agent in agents:
            voting_prompt = agent.get_voting_prompt(
                state["proposal"].description,
                f"Party Position:\n{party_position}\n\nDebate:\n{debate_summary}"
            )

            response = await model.ainvoke([
                SystemMessage(content=agent.get_system_prompt(state["proposal"].description, party_position)),
                HumanMessage(content=voting_prompt)
            ])

            # Parse the vote from response
            vote = parse_vote(_content_text(response), agent, party)
            votes_list.append(vote)

            if display_callback:
                display_callback(vote)

    # Aggregate unique amendments across all voters, preserving first-seen order.
    seen: set[str] = set()
    aggregated_amendments: list[str] = []
    for vote in republican_votes + democrat_votes:
        for amendment in vote.amendments:
            normalized = amendment.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                aggregated_amendments.append(normalized)

    return {
        "republican_votes": republican_votes,
        "democrat_votes": democrat_votes,
        "amendments_proposed": aggregated_amendments,
        "phase": "resolution"
    }


def parse_vote(
    response: str,
    agent: Agent,
    party: Literal["republican", "democrat"],
) -> Vote:
    """Parse vote from agent response."""
    content = response.upper()

    # Determine vote
    vote_value: Literal["support", "oppose", "abstain"]
    if "VOTE: SUPPORT" in content or "VOTE:SUPPORT" in content:
        vote_value = "support"
    elif "VOTE: OPPOSE" in content or "VOTE:OPPOSE" in content:
        vote_value = "oppose"
    else:
        vote_value = "abstain"

    # Extract reasoning
    reasoning = ""
    if "REASONING:" in response:
        parts = response.split("REASONING:", 1)
        if len(parts) > 1:
            reasoning_part = parts[1]
            if "AMENDMENTS:" in reasoning_part:
                reasoning = reasoning_part.split("AMENDMENTS:")[0].strip()
            else:
                reasoning = reasoning_part.strip()

    # Extract amendments
    amendments = []
    if "AMENDMENTS:" in response:
        parts = response.split("AMENDMENTS:", 1)
        if len(parts) > 1:
            amendments_text = parts[1].strip()
            if amendments_text.lower() != "none" and amendments_text:
                amendments = [amendments_text]

    return Vote(
        agent_id=agent.id,
        agent_name=agent.name,
        agent_role=agent.role,
        party=party,
        vote=vote_value,
        reasoning=reasoning[:500] if reasoning else f"Voted {vote_value} based on party principles",
        amendments=amendments
    )
