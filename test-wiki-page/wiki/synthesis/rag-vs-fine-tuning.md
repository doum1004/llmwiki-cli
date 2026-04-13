---
title: RAG vs Fine-Tuning
created: 2024-02-25
updated: 2024-02-25
tags: [synthesis, RAG, fine-tuning, architecture, trade-offs]
---

# RAG vs Fine-Tuning

Two primary strategies exist for giving an LLM access to domain-specific knowledge: **[[retrieval-augmented-generation]]** (inject knowledge at inference time) and **fine-tuning** (bake knowledge into weights at training time). This note synthesizes the trade-offs based on what I've read and observed.

## The Core Trade-Off

| Dimension | RAG | Fine-Tuning |
|-----------|-----|-------------|
| Knowledge freshness | Real-time — update the index, done | Requires re-training |
| Knowledge accuracy | High — verbatim retrieval | Can hallucinate/distort during training |
| Cost to update | Low (index update) | High (GPU training run) |
| Latency | Added retrieval step | No retrieval overhead |
| Interpretability | Can cite retrieved chunks | Knowledge is opaque in weights |
| Style/behavior change | Cannot change model behavior | Can reshape how model responds |

## When to Use RAG

RAG wins when:
- Knowledge changes frequently (news, docs, code, internal data)
- You need to cite sources or show retrieved evidence
- You want to control exactly what information the model uses
- Budget is limited (no GPU training required)
- You're building on top of a third-party model API

Most production knowledge-base Q&A systems use RAG. This includes most enterprise LLM applications.

## When to Use Fine-Tuning

Fine-tuning wins when:
- You need to change model **behavior** or **style**, not just inject knowledge
- You need to teach the model a new format, new domain vocabulary, or new reasoning patterns
- You have a massive labeled dataset and need consistent, fast responses at scale
- You want smaller models to match larger ones on a specific task (distillation)

## The False Dichotomy

Many production systems use both:

```
Query → Retrieve relevant docs (RAG)
      → Fine-tuned model generates response grounded in retrieved docs
```

Example: [[anthropic]]'s Claude is fine-tuned for helpfulness and safety (Constitutional AI), but in deployment it uses tool calls to retrieve external knowledge — RAG on top of a fine-tuned base.

## RAG for Personal Knowledge

For individual researchers and LLM agents, RAG via a structured wiki (llmwiki-cli) is almost always the right choice over fine-tuning:
- Your knowledge base grows and changes constantly
- You cannot fine-tune a commercial API model
- Retrieval via `wiki search` is fast and inspectable

See [[synthesis/why-context-window-matters]] for the related question of when to retrieve vs. just using long context.

> [!TIP]
> A quick heuristic: if you're trying to give the model **facts**, use RAG. If you're trying to give the model **skills**, use fine-tuning.
