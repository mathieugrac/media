# Environment Setup

This guide explains how to set up the clustering feature using Modal (BERTopic) and Groq (labels).

## Overview

The clustering system uses:

1. **Modal.com** - Runs BERTopic (Python) in the cloud for article clustering
2. **Groq** - Free LLM API to generate human-readable topic labels

## Step 1: Install Python (required for Modal CLI)

### On macOS:

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11
brew install python@3.11

# Verify installation
python3 --version
```

### On Windows:

Download and install Python from https://www.python.org/downloads/

## Step 2: Set up Modal

### Create Modal account

1. Go to https://modal.com
2. Sign up with GitHub
3. You get $30/month free credits (more than enough)

### Install Modal CLI

```bash
# Install Modal
pip3 install modal

# Authenticate (opens browser)
modal setup
```

### Deploy the clustering API

```bash
# Navigate to the modal folder
cd modal-clustering

# Deploy to Modal
modal deploy cluster_api.py
```

After deploying, you'll see a URL like:

```
https://your-username--article-clustering-cluster-endpoint.modal.run
```

**Copy this URL** - you'll need it for the next step.

## Step 3: Set up Groq (free LLM)

1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Go to "API Keys" and create a new key
4. Copy the API key

## Step 4: Configure environment variables

Add these to your `.env.local` file:

```env
# Modal API (get URL from Step 2)
MODAL_CLUSTER_API_URL=https://your-username--article-clustering-cluster-endpoint.modal.run

# Groq API (get key from Step 3)
GROQ_API_KEY=gsk_your_groq_api_key_here
```

## Step 5: Restart the development server

```bash
npm run dev
```

## Testing

### Test Modal locally

```bash
cd modal-clustering
modal run cluster_api.py
```

### Test the full flow

Open your app at http://localhost:3000 and articles should now be clustered by topic!

## Costs

| Service | Free Tier | Your Usage (est.) |
| ------- | --------- | ----------------- |
| Modal   | $30/month | ~$0.72/month      |
| Groq    | Unlimited | Free              |

**Total: $0/month** (well within free tiers)

## Troubleshooting

### "MODAL_CLUSTER_API_URL not configured"

- Make sure you deployed to Modal and copied the URL
- Check `.env.local` has the correct URL
- Restart the dev server

### "Modal API error: 500"

- Check Modal dashboard for logs: https://modal.com/apps
- The first request might be slow (cold start)

### "Groq API error"

- Check your API key is correct
- Groq has rate limits but they're generous

### Clustering not working

- Check browser console and server logs for errors
- Minimum 3 articles needed for clustering
- Modal might take 10-30 seconds on first request (cold start)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App (Vercel)                                           │
│                                                                 │
│  1. Fetch RSS articles                                          │
│  2. Send articles to Modal ─────────────────────┐               │
│  4. Receive clusters                            │               │
│  5. Send clusters to Groq for labeling ─────────│───────┐       │
│  7. Display in UI                               │       │       │
└─────────────────────────────────────────────────│───────│───────┘
                                                  │       │
                                                  ▼       │
┌─────────────────────────────────────────────────────────│───────┐
│  Modal (Python)                                         │       │
│                                                         │       │
│  3. Run BERTopic:                                       │       │
│     - Embeddings (sentence-transformers)                │       │
│     - UMAP (dimensionality reduction)                   │       │
│     - HDBSCAN (clustering)                              │       │
│     - Return cluster assignments                        │       │
└─────────────────────────────────────────────────────────│───────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Groq (LLM)                                                     │
│                                                                 │
│  6. Generate human-readable labels:                             │
│     "Réforme des retraites", "Changement climatique", etc.      │
└─────────────────────────────────────────────────────────────────┘
```

## Previous Setup (deprecated)

The old Hugging Face API setup is no longer needed. You can remove `HF_API_KEY` from your `.env.local` if you had it.
