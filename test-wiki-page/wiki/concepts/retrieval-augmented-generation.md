---
title: Retrieval-Augmented Generation
created: 2024-02-15
updated: 2024-02-15
tags: [concept, RAG, retrieval, architecture]
source: https://arxiv.org/abs/2005.11401
---

# Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation (RAG) is an architecture pattern that augments an LLM's generation with dynamically retrieved content from an external knowledge store. Instead of relying solely on knowledge encoded in model weights, the system retrieves relevant documents at inference time and injects them into the [[context-window]].

## How It Works

```
Query → Embed query → Search vector store → Retrieve top-k docs
     → Inject docs into prompt → LLM generates answer
```

1. **Indexing**: Documents are chunked and embedded into a vector store (e.g. Pinecone, Weaviate, pgvector)
2. **Retrieval**: At query time, the query is embedded and nearest-neighbor search finds relevant chunks
3. **Generation**: Retrieved chunks are inserted into the prompt; the LLM generates a response grounded in them

## Why RAG Exists

RAG solves two fundamental limitations of LLMs:
1. **Knowledge cutoff**: Weights are frozen at training time; RAG injects fresh information
2. **Context window limits**: You cannot fit an entire knowledge base in context; RAG selects what's relevant

## RAG vs Fine-Tuning

For keeping knowledge current, RAG is almost always preferred over fine-tuning. See [[synthesis/rag-vs-fine-tuning]] for the full comparison.

## Relevance to llmwiki-cli

llmwiki-cli functions as a lightweight structured RAG system for LLM agents:
- `wiki search` performs keyword retrieval from the wiki corpus
- `wiki read` injects the retrieved page into the agent's context
- The [[agent-loop]] can call these tools repeatedly to accumulate relevant knowledge

> [!NOTE]
> The original RAG paper (Lewis et al. 2020, Facebook AI) used a learned retriever (DPR) combined with BART for generation. Modern RAG systems typically use off-the-shelf embedding models and generative LLMs like GPT-4 or Claude.

> [!WARNING]
> RAG quality depends heavily on chunking strategy and embedding model quality. Naive chunking (fixed-size character splits) often breaks semantic units and hurts retrieval precision.
