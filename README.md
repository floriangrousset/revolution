# 🗳️ Revolution

> *Where AI agents debate politics so you don't have to!* 🎭

A multi-agent political negotiation system where **22 AI agents** (11 Republican 🔴, 11 Democrat 🔵) debate and vote on user-submitted proposals.

[![Made with Claude](https://img.shields.io/badge/Made%20with-Claude%20Code-blueviolet)](https://claude.com/claude-code)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![LangGraph](https://img.shields.io/badge/Powered%20by-LangGraph-orange)](https://github.com/langchain-ai/langgraph)

---

## 🎬 What is This?

Revolution is an **agentic experiment** that simulates political negotiations using LangGraph for orchestration and Claude for reasoning. Users submit proposals (e.g., *"Should we implement universal basic income?"*), and the system runs a full deliberation process:

```
  💡 Your Proposal
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│  🏛️  THE POLITICAL ARENA                                      │
│                                                               │
│   🔴 REPUBLICAN CAUCUS        🔵 DEMOCRAT CAUCUS              │
│   ┌─────────────────┐         ┌─────────────────┐            │
│   │ 🎖️ Party Head    │         │ 🎖️ Party Head    │            │
│   │ 🎓 4 Advisors    │         │ 🎓 4 Advisors    │            │
│   │ 📊 6 Assistants  │         │ 📊 6 Assistants  │            │
│   └────────┬────────┘         └────────┬────────┘            │
│            │                           │                      │
│            └───────────┬───────────────┘                      │
│                        ▼                                      │
│               ⚔️ CROSS-PARTY DEBATE                           │
│                        │                                      │
│                        ▼                                      │
│               🗳️ FINAL VOTING (22 agents)                     │
│                        │                                      │
│                        ▼                                      │
│            ✅ PASSED  or  ❌ REJECTED                         │
└───────────────────────────────────────────────────────────────┘
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎭 **22 Unique Personas** | Each agent has a distinct background, philosophy, and communication style |
| 🏛️ **Party Hierarchy** | Party Head → Senior Advisors → Policy Assistants |
| 🔄 **Multi-Round Debates** | Configurable negotiation rounds with amendment proposals |
| 🤝 **Persuasion Mechanic** | Agents can actually change their votes during debate! |
| 🎨 **Beautiful CLI** | Party-colored panels with Rich library |

## 📺 Example Output

Want to see what a full negotiation looks like? Check out this example session:

👉 **[UBI Negotiation Example](examples/ubi_negotiation.md)** - A complete 2-round debate on Universal Basic Income (Result: 11-11 REJECTED)

## 👥 Meet The Agents

### 🔴 Republican Party (11 agents)

| Role | 👤 Name | 🏷️ Title | 🎯 Specialty |
|------|---------|----------|--------------|
| 🎖️ Party Head | Mike Johnson | Speaker of the House | Legislative Strategy |
| 🎓 Advisor | John Thune | Senate Majority Leader | Tax/Fiscal Policy |
| 🎓 Advisor | Tom Cotton | Senator from Arkansas | National Security |
| 🎓 Advisor | Josh Hawley | Senator from Missouri | Cultural Conservatism |
| 🎓 Advisor | Ted Cruz | Senator from Texas | Constitutional Law |
| 📊 Assistant | Steve Scalise | House Majority Leader | Federal Budget |
| 📊 Assistant | Marco Rubio | Secretary of State | International Trade |
| 📊 Assistant | John Barrasso | Senate Majority Whip | Energy Policy |
| 📊 Assistant | Rand Paul | Senator from Kentucky | Healthcare Policy |
| 📊 Assistant | JD Vance | Vice President | Immigration Policy |
| 📊 Assistant | Lindsey Graham | Senator from South Carolina | Policy Strategy |

### 🔵 Democrat Party (11 agents)

| Role | 👤 Name | 🏷️ Title | 🎯 Specialty |
|------|---------|----------|--------------|
| 🎖️ Party Head | Chuck Schumer | Senate Minority Leader | Caucus Strategy |
| 🎓 Advisor | Elizabeth Warren | Senator from Massachusetts | Financial Regulation |
| 🎓 Advisor | Alexandria Ocasio-Cortez | Representative from New York | Climate Action |
| 🎓 Advisor | Cory Booker | Senator from New Jersey | Criminal Justice/Civil Rights |
| 🎓 Advisor | Jamie Raskin | Representative from Maryland | Constitutional Law |
| 📊 Assistant | Hakeem Jeffries | House Minority Leader | Budget Strategy |
| 📊 Assistant | Bernie Sanders | Senator from Vermont | Labor/Inequality |
| 📊 Assistant | Patty Murray | Senator from Washington | Healthcare Policy |
| 📊 Assistant | Katherine Clark | House Minority Whip | Education Policy |
| 📊 Assistant | Ilhan Omar | Representative from Minnesota | Immigration/Refugees |
| 📊 Assistant | Amy Klobuchar | Senator from Minnesota | Antitrust/Tech Policy |

## 🚀 Quick Start

### Prerequisites

- 🐍 Python 3.11+
- 🔑 Anthropic API key

### Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/floriangrousset/Revolution.git
cd Revolution

# 2️⃣ Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Configure your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Usage

```bash
python -m src.main
```

You'll be prompted to:
1. 📝 Enter your proposal (e.g., *"Should we legalize marijuana?"*)
2. 🔢 Set the maximum number of negotiation rounds (1-5)

Then sit back and watch the political fireworks! 🎆

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `MODEL_NAME` | Claude model to use | `claude-sonnet-4-20250514` |
| `MAX_ROUNDS` | Default max negotiation rounds | `5` |

## 📁 Project Structure

```
Revolution/
├── src/
│   ├── main.py              # 🚀 Entry point
│   ├── state/
│   │   └── types.py         # 📋 State definitions
│   ├── agents/
│   │   ├── base.py          # 🤖 Agent class
│   │   ├── prompts.py       # 💬 System prompts
│   │   ├── republican.py    # 🔴 Republican personas
│   │   └── democrat.py      # 🔵 Democrat personas
│   ├── graphs/
│   │   ├── main_graph.py    # 🎯 Main orchestration
│   │   ├── party_graph.py   # 🏛️ Party deliberation
│   │   └── nodes.py         # 🔗 Graph nodes
│   ├── voting/
│   │   └── consensus.py     # 🗳️ Voting logic
│   └── cli/
│       └── display.py       # 🎨 Rich console output
├── examples/
│   ├── sample_proposals.txt # 💡 Example proposals
│   └── ubi_negotiation.md   # 📄 Example session output
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [🔗 LangGraph](https://github.com/langchain-ai/langgraph) | Multi-agent orchestration |
| [🧠 Claude API](https://www.anthropic.com/) | LLM reasoning (Sonnet/Opus) |
| [🎨 Rich](https://github.com/Textualize/rich) | Beautiful terminal output |
| [✅ Pydantic](https://docs.pydantic.dev/) | Data validation |

## 💡 Sample Proposals to Try

### ⚖️ Social Issues
- *"Should we legalize gay marriage nationwide?"*
- *"Should we implement stricter gun control measures?"*

### 💰 Economic Policy
- *"Should we raise the federal minimum wage to $15/hour?"*
- *"Should we implement a universal basic income?"*

### 🏥 Healthcare
- *"Should we implement Medicare for All?"*

### 🌍 Climate
- *"Should we implement a Green New Deal?"*

### ⚖️ Criminal Justice
- *"Should we abolish the death penalty?"*

## 🔄 How It Works

### Phase 1: 🏛️ Party Deliberation

Each party goes through internal deliberation:

1. **🎖️ Party Head Introduction** - Frames the proposal and sets the agenda
2. **🎓 Advisor Analysis** - Each of 4 advisors analyzes from their expertise
3. **📊 Assistant Research** - 6 assistants provide supporting data
4. **📝 Position Synthesis** - Party head synthesizes into official position

### Phase 2: ⚔️ Cross-Party Debate

- Party heads present their positions
- Advisors engage in point/counterpoint
- Amendments may be proposed
- Multiple rounds possible (configurable)

### Phase 3: 🗳️ Final Voting

- All 22 agents vote: **SUPPORT** / **OPPOSE** / **ABSTAIN**
- Each provides reasoning based on their philosophy
- Votes can change based on debate (persuasion mechanic!)
- Simple majority wins (50%+1 of non-abstaining votes)

## ⏱️ Performance Notes

| Metric | Value |
|--------|-------|
| ⏰ Session Time | 5-15 minutes (depending on rounds) |
| 📡 API Calls | ~50-100 per session |
| 💵 Recommended Model | Claude Sonnet (cost efficient) |
| 🏆 Premium Model | Claude Opus (higher quality) |

## 🤝 Contributing

Contributions are welcome! Some ideas:

- 🎭 Add more agent personas
- 📜 Implement amendment negotiation logic
- 📊 Add historical voting record tracking
- 🌐 Create a web interface
- 🗳️ Add more political parties (Libertarian 🟡, Green 🟢, etc.)

## 📄 License

MIT License - see LICENSE file for details.

---

<div align="center">

**Built with ❤️ and [Claude Code](https://claude.com/claude-code)**

*"Democracy is the art of thinking independently together." - Alexander Meiklejohn*

🗳️ **Happy Debating!** 🗳️

</div>
