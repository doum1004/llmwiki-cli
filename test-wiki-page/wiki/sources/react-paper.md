---
title: ReAct — Synergizing Reasoning and Acting in Language Models
created: 2024-02-10
updated: 2024-02-10
tags: [paper, agents, reasoning, acting, ReAct]
source: https://arxiv.org/abs/2210.03629
---

# ReAct: Synergizing Reasoning and Acting in Language Models

**Authors**: Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, Yuan Cao (Princeton / Google Brain)
**Published**: October 2022 (ICLR 2023)

## Summary

ReAct proposes interleaving **Rea**soning traces (chain-of-thought) and **Act**ing (tool calls) in a single LLM prompt. By alternating between "Thought: ..." and "Action: ..." steps, the model produces interpretable, grounded reasoning that is directly coupled to external tool use.

## The ReAct Pattern

```
Question: What is the capital of the country that won the 2022 FIFA World Cup?

Thought: I need to find which country won the 2022 World Cup first.
Action: Search[2022 FIFA World Cup winner]
Observation: Argentina won the 2022 FIFA World Cup, defeating France on penalties.

Thought: Argentina's capital is Buenos Aires.
Action: Finish[Buenos Aires]
```

## Why ReAct Works

**[[chain-of-thought]] alone** hallucinates facts — the model reasons but has no way to verify claims.

**Acting alone** (without reasoning) produces brittle tool use — the model can't plan multi-step retrieval.

**ReAct combines them**: reasoning guides which actions to take; observations from actions correct and update the reasoning trace.

## Tasks Evaluated

The paper evaluates ReAct on:
1. **HotpotQA** — multi-hop question answering requiring chained Wikipedia lookups
2. **FEVER** — fact verification requiring evidence retrieval
3. **ALFWorld** — interactive text game requiring navigation + object manipulation
4. **WebShop** — web shopping simulation requiring search + selection

ReAct outperformed chain-of-thought-only and action-only baselines on all tasks.

## Influence on Agent Frameworks

ReAct is the conceptual backbone of most modern [[agent-loop]] implementations:
- LangChain's AgentExecutor
- AutoGPT and BabyAGI
- Claude's tool use / function calling
- OpenAI's Assistants API with function calling

> [!TIP]
> The key insight is that reasoning traces make agents **debuggable** — you can read the Thought steps to understand why the agent chose an action. This is essential for production agent systems. See [[synthesis/ai-agent-patterns]].
