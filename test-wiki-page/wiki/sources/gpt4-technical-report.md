---
title: GPT-4 Technical Report
created: 2024-01-20
updated: 2024-01-20
tags: [paper, GPT-4, OpenAI, multimodal, evals]
source: https://arxiv.org/abs/2303.08774
---

# GPT-4 Technical Report

**Authors**: OpenAI
**Published**: March 2023

## Overview

The GPT-4 Technical Report describes [[openai]]'s fourth-generation large language model. Notably, the report deliberately withholds most technical details (parameter count, training data, architecture specifics) for competitive and safety reasons — a controversial decision.

## Key Capabilities

### Multimodality
GPT-4 accepts both image and text inputs (text outputs only at launch). It can describe images, read charts, solve visual math problems, and interpret screenshots.

### Benchmark Performance
GPT-4 achieved human-level or above-human-level performance on several professional exams:

| Exam | GPT-3.5 Percentile | GPT-4 Percentile |
|------|--------------------|-----------------|
| Bar Exam | ~10th | ~90th |
| SAT | ~87th | ~93rd |
| GRE Verbal | ~63rd | ~99th |
| USMLE Step 1 | ~53rd | ~75th+ |

### Extended Context Window
GPT-4 launched with an 8K token [[context-window]], later extended to 32K — a significant increase over GPT-3.5's 4K, enabling longer documents and conversation histories.

## RLHF and Alignment

The report describes an extensive RLHF (Reinforcement Learning from Human Feedback) pipeline:
1. Supervised fine-tuning on human-written demonstrations
2. Reward model trained on human comparisons
3. PPO optimization against the reward model
4. Rule-based reward models (RBRMs) for absolute safety behaviors

## Evals and Red-Teaming

OpenAI engaged external red-teamers before launch to test for:
- Dangerous capability elicitation (bio/chem/cyber)
- Jailbreaks and policy violations
- Deceptive alignment risks

> [!NOTE]
> The report introduced a reproducible eval framework. The [[llm-scaling-laws]] suggest GPT-4's capabilities were largely predictable from the compute budget used — though OpenAI has not confirmed exact training FLOPs.

> [!WARNING]
> Because so many technical details were withheld, the GPT-4 Technical Report is more useful as a capabilities/evals reference than as an architecture reference. Contrast with [[sources/attention-is-all-you-need]], which is fully open.
