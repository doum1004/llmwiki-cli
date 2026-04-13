---
title: Claude 3 Model Card
created: 2024-02-01
updated: 2024-02-01
tags: [paper, Claude, Anthropic, safety, evals]
source: https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf
---

# Claude 3 Model Card

**Authors**: [[anthropic]]
**Published**: March 2024

## Overview

The Claude 3 model card covers the three-tier Claude 3 family: **Haiku** (fast/cheap), **Sonnet** (balanced), and **Opus** (most capable). This is Anthropic's first model card for a released frontier model family.

## Model Tiers

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| Claude 3 Haiku | Fastest | Lowest | High-volume tasks, classification |
| Claude 3 Sonnet | Moderate | Medium | General use, coding |
| Claude 3 Opus | Slowest | Highest | Complex reasoning, research |

## Context Window

All Claude 3 models support a 200K token [[context-window]] — roughly 150,000 words. This is the largest commercially available context window at launch, enabling:
- Full-book analysis in a single call
- Large codebase review
- Long research sessions without chunking

## Safety Evaluations

The model card is notable for its safety eval methodology:

### Responsible Scaling Policy (RSP)
Anthropic's RSP defines capability thresholds ("ASL" levels) that trigger additional safeguards before deployment. Claude 3 was evaluated against ASL-3 criteria (uplift for CBRN weapons, autonomous replication).

### CBRN Uplift Testing
Red-teamers tested whether models provided meaningful uplift for chemical, biological, radiological, or nuclear harm. Claude 3 Opus did not meet the ASL-3 threshold for dangerous uplift.

### Child Safety
Absolute behavioral refusals are maintained regardless of prompt framing.

## Benchmark Results

Claude 3 Opus outperforms GPT-4 on several benchmarks at release:
- MMLU: 86.8% vs GPT-4's 86.4%
- HumanEval: 84.9% vs GPT-4's 67.0%
- GSM8K: 95.0% vs GPT-4's 92.0%

> [!NOTE]
> The model card openly discusses failure modes and known limitations — a more candid approach than [[sources/gpt4-technical-report]], which omitted most technical details.

> [!TIP]
> For [[agent-loop]] applications, Claude 3 Sonnet's combination of large context, strong instruction following, and moderate cost makes it a practical default choice.
