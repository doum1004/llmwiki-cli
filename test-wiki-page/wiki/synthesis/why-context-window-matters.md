---
title: Why Context Window Size Matters
created: 2024-02-20
updated: 2024-02-20
tags: [synthesis, context-window, RAG, architecture, trade-offs]
---

# Why Context Window Size Matters

The [[context-window]] has become one of the most strategically important axes of LLM competition. This note synthesizes what I've learned tracking the space and examines the real-world trade-offs.

## The Race to Longer Context

[[anthropic]] pushed from 9K tokens (Claude 1) to 200K (Claude 3) in about a year. [[google-deepmind]] announced Gemini 1.5 Pro with 1M tokens in February 2024. [[openai]]'s GPT-4 lags behind in context length but leads in other areas.

This arms race is driven by a simple user demand: people want to paste in entire codebases, books, or transcripts and ask questions about them without worrying about chunking.

## What Large Context Enables

1. **Full-document reasoning**: Summarize a 300-page report, compare two books, review a whole codebase — all in one shot
2. **Long agent sessions**: An [[agent-loop]] that runs for 50+ steps accumulates substantial history; 200K tokens buys significantly more headroom than 32K
3. **Fewer RAG dependencies**: With enough context, you can skip the retrieval pipeline entirely and just load all relevant data upfront — simpler architecture, lower latency
4. **In-context learning at scale**: More examples fit → better few-shot performance

## What Large Context Doesn't Solve

> [!WARNING]
> Long context is not a substitute for persistent knowledge management.

- **Retrieval within context is imperfect**: Research shows models attend poorly to information in the middle of very long contexts ("lost in the middle" problem). Beginning and end of context get disproportionate attention.
- **Cost scales with tokens**: A 200K token call to Claude 3 Opus costs significantly more than a focused 2K token call after [[retrieval-augmented-generation]] retrieval.
- **Knowledge doesn't accumulate across sessions**: Even a 1M token window resets between conversations. A wiki persists.
- **Latency**: First-token latency grows with context length. For interactive applications, long-context calls are slow.

## The Right Mental Model

Think of context window and [[retrieval-augmented-generation]] as **complementary**, not competing:

| Tool | Best For |
|------|---------|
| Large context | One-shot processing of a known, bounded document set |
| RAG | Searching across a large corpus to find what's relevant |
| External wiki | Accumulating knowledge persistently across sessions |

> [!NOTE]
> [[anthropic]]'s position — leading on context length — makes sense given their safety focus. Long context reduces the need for tool use, which reduces the attack surface from malicious tool outputs in agentic settings.

## Implication for Knowledge Management

Even with 1M token context, you still need a structured knowledge base. A year of research notes, dozens of papers, hundreds of observations — this grows far beyond any context window. The right approach is: use [[retrieval-augmented-generation]] or a wiki (like llmwiki-cli) to surface the 5–10 most relevant pages, then use context to reason over them.
