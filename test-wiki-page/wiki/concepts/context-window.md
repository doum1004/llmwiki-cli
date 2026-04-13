---
title: Context Window
created: 2024-01-20
updated: 2024-01-20
tags: [concept, architecture, inference, tokens]
---

# Context Window

The context window (also called context length or context limit) is the maximum number of tokens a language model can process in a single forward pass — encompassing both the input prompt and the generated output. Everything outside the context window is invisible to the model.

## Why It Matters

Context window size is one of the most practically important properties of a deployed LLM:

- **In-context learning**: The model can only use examples, documents, or conversation history that fits in the window
- **Long-document tasks**: Summarization, question-answering over books or codebases require large windows
- **Agent memory**: An [[agent-loop]] accumulates observations and history; a small context window means the agent forgets recent steps
- **RAG trade-off**: Small windows force reliance on [[retrieval-augmented-generation]]; large windows reduce the need to retrieve

## Historical Progression

| Model | Year | Context |
|-------|------|---------|
| GPT-3 | 2020 | 4K tokens |
| GPT-4 | 2023 | 8K–32K tokens |
| Claude 2 | 2023 | 100K tokens |
| Claude 3 | 2024 | 200K tokens |
| Gemini 1.5 Pro | 2024 | 1M tokens |

## Technical Constraints

Context window size is limited by:
1. **Quadratic attention complexity**: Standard self-attention scales as O(n²) in sequence length — doubling the context quadruples compute
2. **KV cache memory**: Each token in the context requires storing key-value pairs in GPU memory
3. **Positional encoding generalization**: Models must be trained on long sequences to handle them well; RoPE and ALiBi help with generalization

## Implications for Knowledge Management

A large context window does not eliminate the need for a tool like llmwiki-cli. Even a 1M token window cannot hold months of accumulated research. See [[synthesis/why-context-window-matters]] for the full analysis.

> [!TIP]
> [[anthropic]]'s Claude 3 at 200K tokens can process roughly 150,000 words — the equivalent of a 500-page book — in a single prompt. This makes it practical for full-codebase analysis without chunking.
