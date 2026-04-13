---
title: Anthropic
created: 2024-02-01
updated: 2024-02-01
tags: [company, LLM, AI-safety, research]
source: https://anthropic.com
---

# Anthropic

Anthropic is an AI safety company founded in 2021 by former [[openai]] researchers, led by Dario Amodei (CEO) and Daniela Amodei (President). The company focuses on building reliable, interpretable, and steerable AI systems.

## Founding and Background

Seven of Anthropic's eleven founders came from [[openai]], departing over concerns about the pace of capability development relative to safety work. This origin story shapes Anthropic's emphasis on alignment research alongside product development.

## Claude Model Family

Anthropic's flagship product line is Claude. See [[sources/claude-model-card]] for the full technical details.

| Version | Release | Context Window |
|---------|---------|----------------|
| Claude 1 | Mar 2023 | 9K tokens |
| Claude 2 | Jul 2023 | 100K tokens |
| Claude 3 Haiku/Sonnet/Opus | Mar 2024 | 200K tokens |

The dramatic expansion of the [[context-window]] — from 9K to 200K tokens — is a defining competitive advantage. See [[synthesis/why-context-window-matters]] for analysis.

## Constitutional AI

Anthropic's key alignment approach is **Constitutional AI (CAI)**: instead of relying entirely on human feedback, the model is trained with a set of principles ("constitution") to self-critique and revise outputs. This reduces dependence on human labelers for harmlessness training.

## Safety Research

Anthropic publishes significant interpretability research, including mechanistic interpretability work trying to understand what computations happen inside transformer layers.

> [!NOTE]
> Anthropic received $300M from Google in 2023, followed by a further $2B commitment, giving Google a minority stake. Amazon also invested up to $4B in late 2023.

> [!WARNING]
> Despite the safety focus, Anthropic still ships capable frontier models — the tension between capability and safety is ongoing and unresolved.
