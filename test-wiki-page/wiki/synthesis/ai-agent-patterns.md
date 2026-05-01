---
title: AI Agent Patterns
created: 2024-03-01
updated: 2024-03-01
tags: [synthesis, agents, architecture, patterns, production]
---

# AI Agent Patterns

After reading [[sources/react-paper]], tracking several open-source agent frameworks, and following production deployments, I've identified recurring architectural patterns. This is a living synthesis note.

## Pattern 1: ReAct Loop (Reasoning + Acting)

The baseline pattern from [[sources/react-paper]]. The model alternates between reasoning traces and tool calls until it reaches a final answer.

**Best for**: Single-agent tasks with well-defined tools and clear success criteria.

**Limitations**: Fragile on long chains; one bad tool call can derail the whole trace.

## Pattern 2: Plan-and-Execute

The agent first generates a complete plan (list of steps), then executes each step in order, potentially with a different (cheaper) model for execution.

```
Planner LLM → [step1, step2, step3, ...]
Executor LLM → execute(step1) → result
Executor LLM → execute(step2) → result
...
```

**Best for**: Tasks where the subtasks are well-understood and execution is mechanical.

## Pattern 3: Multi-Agent Orchestration

Multiple specialized agents collaborate, each with a different prompt/tools/model tier:
- **Orchestrator**: Plans, assigns tasks, integrates results
- **Researcher**: Searches the web, reads documents
- **Coder**: Writes and executes code
- **Critic**: Reviews outputs for quality

**Best for**: Complex tasks requiring diverse expertise (e.g., "research X, write a report, add visualizations").

## Pattern 4: Reflection and Self-Critique

After completing a task, the agent reviews its own output and iteratively improves it. Related to [[chain-of-thought]] self-consistency.

```
Draft answer → Critique(draft) → Revised answer → Critique(revised) → ...
```

## Pattern 5: Memory-Augmented Agents

The [[agent-loop]] integrates with a persistent external memory (vector DB, structured wiki). After each session, key observations are written to memory; at the start of each session, relevant memories are retrieved.

This is exactly what llmwiki-cli supports:
- **Write**: `wiki write wiki/entities/new-finding.md` with JSON on stdin (see `SCHEMA.md` in the wiki root)
- **Retrieve**: `wiki search "relevant topic"`
- **Connect**: add wikilinks between pages to build a knowledge graph

Using [[retrieval-augmented-generation]] within the agent loop transforms the agent from a stateless responder to a system that accumulates expertise over time.

Demo wiki conventions and JSON write examples: [[SCHEMA.md]].

## Key Failure Modes Across All Patterns

> [!WARNING]
> The most common production failure is **context overflow**: long agent sessions fill the [[context-window]], causing the model to lose track of earlier observations or instructions. Always monitor token usage in production agents.

| Failure | Pattern | Fix |
|---------|---------|-----|
| Hallucinated tool calls | All | Strict JSON schema validation |
| Context overflow | ReAct, Plan-Execute | Summarize history at checkpoints |
| Divergent multi-agent | Multi-Agent | Shared state store with conflict resolution |
| Self-critique loops | Reflection | Max iteration limit |
| Stale memory | Memory-Augmented | TTL on memory entries + periodic maintenance |

## Recommendations

1. Start with ReAct — it's the simplest and most debuggable
2. Add memory (wiki/vector store) early — retrofitting is hard
3. Use smaller models for execution, larger for planning
4. Log all agent traces — you need them for debugging
5. Design for graceful degradation — agents will fail; plan the fallback

> [!NOTE]
> [[openai]]'s o1 / o3 models (late 2024) internalize multi-step reasoning into a private "thinking" chain before output. This reduces the need for explicit ReAct prompting but makes the reasoning less inspectable — a trade-off for production debugging.
