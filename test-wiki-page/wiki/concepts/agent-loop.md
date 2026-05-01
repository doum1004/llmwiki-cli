---
title: Agent Loop
created: 2024-02-10
updated: 2024-02-10
tags: [concept, agents, autonomy, architecture]
---

# Agent Loop

The agent loop is the core execution pattern of an autonomous LLM agent: a repeating cycle of **Observe → Think → Act** that continues until the agent reaches a goal or is stopped. Each iteration the agent receives new observations, reasons about them using [[chain-of-thought]], selects an action (tool call, message, or termination), and processes the result.

## Basic Structure

```
while not done:
    observation = get_context()          # current state, memory, tool results
    thought = llm.think(observation)     # chain-of-thought reasoning
    action = llm.choose_action(thought)  # tool call or final answer
    result = execute(action)             # run the tool
    memory.append(observation, thought, action, result)
```

## Key Components

### Memory
- **In-context**: Everything in the [[context-window]] — conversation, tool outputs, instructions
- **External**: Retrieved from stores via [[retrieval-augmented-generation]] — the wiki, vector DB, etc.

### Tools
The set of actions available to the agent. Common tools:
- Web search / browser
- Code interpreter / REPL
- File read/write (e.g. `wiki read`, `wiki write` with JSON on stdin)
- API calls

### Termination
The agent must know when to stop. Poor termination criteria lead to infinite loops or premature exits.

## ReAct Pattern

The most widely-used agent loop variant is ReAct (Reasoning + Acting), from [[sources/react-paper]]. It interleaves natural-language reasoning traces with tool call actions, making the agent's decisions inspectable.

## Failure Modes

| Failure | Cause | Mitigation |
|---------|-------|-----------|
| Hallucinated tool calls | Model invents non-existent tools | Strict function schema validation |
| Context overflow | Long loops fill the [[context-window]] | Summarize or compress history |
| Stuck in loop | No progress, keeps retrying | Max step limit + backoff |
| Over-planning | Too much thinking, too little acting | Temperature tuning, step limits |

> [!TIP]
> llmwiki-cli is designed to be a tool inside an agent loop: the agent calls `wiki search`, `wiki read`, and `wiki write` (JSON body) as actions, using the wiki as its external long-term memory.

See [[synthesis/ai-agent-patterns]] for patterns that have emerged in production agent systems.
