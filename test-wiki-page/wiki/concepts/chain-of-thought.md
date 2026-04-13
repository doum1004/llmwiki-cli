---
title: Chain-of-Thought
created: 2024-02-10
updated: 2024-02-10
tags: [concept, prompting, reasoning, CoT]
source: https://arxiv.org/abs/2201.11903
---

# Chain-of-Thought (CoT)

Chain-of-thought prompting is a technique that elicits step-by-step reasoning from a language model by including examples that show the reasoning process — not just the final answer. Introduced by Wei et al. (Google Brain, 2022), it dramatically improves performance on multi-step reasoning tasks.

## Key Variants

| Variant | How | When to Use |
|---------|-----|-------------|
| Few-shot CoT | Include worked examples in prompt | Tasks with clear reasoning steps |
| Zero-shot CoT | Append "Let's think step by step" | Quick boost without example construction |
| Self-consistency | Sample multiple CoT paths, majority vote | High-stakes tasks requiring reliability |
| Tree of Thoughts | Branch reasoning into tree, search over paths | Very complex multi-step problems |

## Why It Works

Transformers process tokens sequentially. By forcing the model to generate intermediate reasoning steps before the final answer, CoT:
1. Allocates more computation (tokens) to hard steps
2. Externalizes working memory that would otherwise be compressed into hidden states
3. Creates a "scratchpad" that the model can condition on when generating later tokens

## Connection to Agents

Chain-of-thought is the cognitive substrate of [[agent-loop]]. When an agent uses a ReAct-style loop (see [[sources/react-paper]]), the "think" step is CoT reasoning — the agent writes out its plan before choosing an action.

```
Observation: search results for "Paris population"
Thought: The results show Paris has 2.1M city / 12M metro. I need the metro figure.
Action: answer("The Paris metro area has approximately 12 million people.")
```

> [!TIP]
> CoT is most effective on models with ≥ 100B parameters. On smaller models, it can actually hurt performance by generating plausible-sounding but incorrect reasoning chains.

> [!NOTE]
> [[openai]]'s o1 and o3 models (2024) internalize chain-of-thought as a latent "thinking" process before producing output — a productized version of explicit CoT prompting.
