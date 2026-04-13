---
title: Attention Is All You Need
created: 2024-01-15
updated: 2024-01-15
tags: [paper, transformer, attention, architecture]
source: https://arxiv.org/abs/1706.03762
---

# Attention Is All You Need

**Authors**: Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin ([[google-deepmind|Google Brain]] / Google Research)
**Published**: June 2017 (NeurIPS 2017)

## Summary

This paper introduced the **Transformer** architecture, replacing recurrent and convolutional networks with a mechanism called **self-attention** for sequence-to-sequence tasks. It became the foundation for virtually every large language model built since 2018.

## Key Contributions

### Self-Attention Mechanism
Each token in the sequence computes attention weights over all other tokens, enabling the model to relate positions regardless of distance:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) V
```

- **Q** (Query), **K** (Key), **V** (Value) — linear projections of token embeddings
- Division by √d_k prevents vanishing gradients in softmax at large dimensions

### Multi-Head Attention
Instead of a single attention function, the paper uses h=8 parallel attention heads, each learning different relationship types (syntax, coreference, semantics, etc.)

### Positional Encoding
Since self-attention is permutation-invariant, sinusoidal position encodings inject order information.

### Architecture
```
Encoder: Embedding → N × (Multi-Head Attn → FFN) → output representations
Decoder: Embedding → N × (Masked MHA → Cross-Attn → FFN) → token probabilities
```

## Why It Matters

1. **Parallelism**: Unlike RNNs, all positions process simultaneously during training → orders of magnitude faster on GPUs
2. **Long-range dependencies**: O(1) path length between any two positions vs O(n) for RNNs
3. **Scale**: The architecture scales smoothly — see [[llm-scaling-laws]]

## Impact

The transformer is now the backbone of GPT (see [[sources/gpt4-technical-report]]), Claude (see [[sources/claude-model-card]]), Gemini, and essentially every frontier model. It is one of the most cited ML papers of all time.

> [!NOTE]
> The paper's title was partly a provocation — at the time, the dominant view was that attention was useful *alongside* recurrence, not as a replacement. The title's confidence was validated rapidly.
