# Modal Clustering API

This folder contains the Python code that runs on [Modal.com](https://modal.com) to cluster articles using BERTopic.

## Setup Instructions

### 1. Install Python (if not already installed)

**On macOS:**

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11
```

**Verify installation:**

```bash
python3 --version
# Should show Python 3.11.x or higher
```

### 2. Install Modal CLI

```bash
# Install Modal
pip3 install modal

# Authenticate with Modal (opens browser)
modal setup
```

### 3. Deploy the Clustering API

```bash
# Navigate to this folder
cd modal-clustering

# Deploy to Modal
modal deploy cluster_api.py
```

After deploying, Modal will show you the endpoint URL. It will look like:

```
https://your-username--article-clustering-cluster-endpoint.modal.run
```

### 4. Add the URL to your environment

Copy the endpoint URL and add it to your `.env.local` file:

```
MODAL_CLUSTER_API_URL=https://your-username--article-clustering-cluster-endpoint.modal.run
```

## Testing

You can test the API locally before deploying:

```bash
# Run locally (uses Modal's cloud but from your terminal)
modal run cluster_api.py
```

Or test the deployed endpoint:

```bash
curl -X POST "YOUR_ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {"id": "1", "title": "Test article", "excerpt": "Test content"}
    ]
  }'
```

## How it works

1. **BERTopic** is a state-of-the-art topic modeling library
2. It uses **sentence-transformers** to convert article text to vectors
3. **UMAP** reduces the dimensionality of the vectors
4. **HDBSCAN** clusters the reduced vectors
5. **c-TF-IDF** extracts keywords for each cluster

The model used is `paraphrase-multilingual-MiniLM-L12-v2` which works well with French text.

## Costs

Modal's free tier gives you $30/month in credits. This API typically uses:

- ~$0.001 per request for 100-500 articles
- Running hourly = ~$0.72/month (well within free tier)
