---
title: LLM Scaling Laws
created: 2024-01-15
updated: 2024-01-15
tags: [concept, scaling, training, compute]
source: https://arxiv.org/abs/2001.08361
---

# LLM Scaling Laws

Scaling laws describe the empirical relationship between model performance (measured as cross-entropy loss on held-out text) and three key resources: model parameters (N), training data tokens (D), and compute budget (C). The key finding is that performance improves as a smooth power law — predictably and reliably — as these quantities increase.

## Key Papers

1. **Kaplan et al. 2020** ("Scaling Laws for Neural Language Models") — [[openai]] researchers established the foundational relationships. Found that N and D should be scaled together, but suggested parameters matter more.
2. **Hoffmann et al. 2022** ("Training Compute-Optimal LLMs", aka "Chinchilla") — [[google-deepmind]] researchers revised the Kaplan findings, showing models were being under-trained. The Chinchilla-optimal ratio is roughly **20 tokens per parameter**.

## Core Relationships

```
Loss ∝ N^(-α)   (more parameters → lower loss)
Loss ∝ D^(-β)   (more data → lower loss)
Loss ∝ C^(-γ)   (more compute → lower loss)
```

where α ≈ 0.076, β ≈ 0.095, γ ≈ 0.050 (Kaplan et al.)

## Implications

- You can predict how good a model will be **before training it** if you know the compute budget
- Bigger models are more **sample-efficient** — they learn more per token
- There is an optimal allocation of compute between model size and training data for a fixed budget
- Performance improvements from scale have not shown signs of plateauing on standard benchmarks (as of 2024)

## Chinchilla Correction

Pre-Chinchilla models (GPT-3, PaLM, Gopher) were significantly over-parameterized relative to their training data. The Chinchilla paper showed a 70B parameter model trained on 1.4T tokens (Chinchilla) outperformed a 280B model (Gopher) trained on fewer tokens — with 4× less compute.

> [!NOTE]
> [[andrej-karpathy]] frequently cites scaling laws as the core reason the field moved from hand-engineering features to scaling simple architectures. The [[sources/attention-is-all-you-need]] transformer is the architecture that made scaling practical.

> [!WARNING]
> Scaling laws apply to pre-training loss. They do not directly predict performance on specific downstream tasks, reasoning benchmarks, or instruction-following quality — those require additional alignment techniques.
