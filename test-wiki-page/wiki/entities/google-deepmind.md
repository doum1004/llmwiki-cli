---
title: Google DeepMind
created: 2024-01-15
updated: 2024-01-15
tags: [company, LLM, research, Google]
source: https://deepmind.google
---

# Google DeepMind

Google DeepMind is the merged AI research division of Google, formed in April 2023 by combining Google Brain and DeepMind. It is led by Demis Hassabis (DeepMind founder) as CEO.

## History

- **DeepMind** (founded 2010, acquired by Google 2014) — famous for AlphaGo, AlphaFold, Gemini
- **Google Brain** (founded 2011) — developed TensorFlow, pioneered large-scale neural net training; authors of [[sources/attention-is-all-you-need]]
- **Merger** (April 2023) — combined into Google DeepMind to compete more directly with [[openai]] and [[anthropic]]

## Key Contributions

### Transformer Architecture
Google Brain researchers authored the foundational "Attention Is All You Need" paper (2017), which introduced the transformer — now the basis for virtually all large language models. See [[sources/attention-is-all-you-need]].

### Scaling Research
Google was an early contributor to [[llm-scaling-laws]] research, publishing work on compute-optimal training (Chinchilla, 2022), which showed that many models were under-trained relative to their parameter count.

### Gemini
Gemini is Google DeepMind's frontier model family, competing directly with GPT-4 and Claude 3.

| Version | Release | Notes |
|---------|---------|-------|
| Gemini 1.0 | Dec 2023 | Ultra / Pro / Nano tiers |
| Gemini 1.5 Pro | Feb 2024 | 1M token context window |
| Gemini 1.5 Flash | May 2024 | Efficient, fast variant |

> [!NOTE]
> Gemini 1.5 Pro's 1 million token [[context-window]] is currently the largest available in a production model, enabling entirely new use cases like processing full codebases or hour-long videos.
