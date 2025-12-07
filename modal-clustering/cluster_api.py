"""
Modal API for article clustering using BERTopic.
This runs on Modal.com and is called by the Next.js app.
"""

import modal

# Define the Modal app
app = modal.App("article-clustering")

# Define the container image with all dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "bertopic>=0.16.0",
    "sentence-transformers>=2.2.0",
    "umap-learn>=0.5.0",
    "hdbscan>=0.8.0",
    "scikit-learn>=1.3.0",
    "numpy>=1.24.0",
    "fastapi",  # Required for web endpoints
)


@app.function(
    image=image,
    timeout=300,  # 5 minutes max
    memory=2048,  # 2GB RAM
)
def cluster_articles(articles: list[dict]) -> dict:
    """
    Cluster articles by topic using BERTopic.
    
    Args:
        articles: List of dicts with 'id', 'title', 'excerpt' keys
        
    Returns:
        Dict with 'clusters' containing grouped article IDs and keywords
    """
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    from sklearn.feature_extraction.text import CountVectorizer
    import numpy as np
    
    if not articles or len(articles) < 3:
        return {
            "clusters": [],
            "message": "Not enough articles to cluster (minimum 3)"
        }
    
    # Prepare documents (combine title + excerpt)
    documents = []
    article_ids = []
    for article in articles:
        text = f"{article.get('title', '')} {article.get('excerpt', '')}".strip()
        if text:
            documents.append(text)
            article_ids.append(article.get('id', ''))
    
    if len(documents) < 3:
        return {
            "clusters": [],
            "message": "Not enough valid documents to cluster"
        }
    
    # Use a multilingual model for French
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    
    # French stop words for better topic extraction
    french_stop_words = [
        "le", "la", "les", "de", "du", "des", "un", "une", "et", "est", "en",
        "que", "qui", "dans", "pour", "sur", "avec", "par", "au", "aux", "ce",
        "cette", "ces", "son", "sa", "ses", "leur", "leurs", "nous", "vous",
        "ils", "elles", "ont", "sont", "être", "avoir", "fait", "faire", "plus",
        "tout", "tous", "toute", "toutes", "peut", "même", "aussi", "comme",
        "mais", "ou", "donc", "car", "ni", "ne", "pas", "se", "si", "sans"
    ]
    
    # Configure CountVectorizer for French
    vectorizer_model = CountVectorizer(
        stop_words=french_stop_words,
        ngram_range=(1, 2),
        min_df=2
    )
    
    # Configure BERTopic
    topic_model = BERTopic(
        embedding_model=embedding_model,
        vectorizer_model=vectorizer_model,
        language="french",
        min_topic_size=2,  # Minimum 2 articles per topic
        nr_topics="auto",  # Auto-detect number of topics
        verbose=False
    )
    
    # Fit the model
    topics, probabilities = topic_model.fit_transform(documents)
    
    # Get topic info
    topic_info = topic_model.get_topic_info()
    
    # Build the response
    clusters = []
    
    # Group articles by topic
    topic_to_articles = {}
    for idx, topic_id in enumerate(topics):
        if topic_id == -1:  # Skip outliers/noise
            continue
        if topic_id not in topic_to_articles:
            topic_to_articles[topic_id] = []
        topic_to_articles[topic_id].append({
            "id": article_ids[idx],
            "title": articles[idx].get("title", ""),
            "probability": float(probabilities[idx]) if probabilities is not None else 1.0
        })
    
    # Build cluster objects with keywords
    for topic_id, topic_articles in topic_to_articles.items():
        if len(topic_articles) < 2:  # Skip tiny clusters
            continue
            
        # Get top keywords for this topic
        topic_words = topic_model.get_topic(topic_id)
        keywords = [word for word, score in topic_words[:5]] if topic_words else []
        
        # Get topic name from topic_info
        topic_row = topic_info[topic_info['Topic'] == topic_id]
        topic_name = topic_row['Name'].values[0] if len(topic_row) > 0 else f"Topic {topic_id}"
        
        clusters.append({
            "id": f"cluster-{topic_id}",
            "articleIds": [a["id"] for a in topic_articles],
            "keywords": keywords,
            "topicName": topic_name,
            "size": len(topic_articles)
        })
    
    # Sort by cluster size (largest first)
    clusters.sort(key=lambda x: x["size"], reverse=True)
    
    # Also return unclustered articles
    unclustered_ids = [
        article_ids[idx] for idx, topic_id in enumerate(topics) if topic_id == -1
    ]
    
    return {
        "clusters": clusters,
        "unclusteredIds": unclustered_ids,
        "totalArticles": len(documents),
        "clusteredArticles": len(documents) - len(unclustered_ids),
        "message": f"Successfully created {len(clusters)} clusters"
    }


# Web endpoint for the API
@app.function(image=image, timeout=300, memory=2048)
@modal.fastapi_endpoint(method="POST")
def cluster_endpoint(data: dict) -> dict:
    """
    HTTP endpoint for clustering articles.
    
    Expected POST body:
    {
        "articles": [
            {"id": "1", "title": "...", "excerpt": "..."},
            ...
        ]
    }
    """
    articles = data.get("articles", [])
    
    if not articles:
        return {"error": "No articles provided", "clusters": []}
    
    try:
        result = cluster_articles.remote(articles)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "clusters": [],
            "message": f"Clustering failed: {str(e)}"
        }


# For local testing
@app.local_entrypoint()
def main():
    """Test the clustering with sample articles."""
    sample_articles = [
        {"id": "1", "title": "Macron annonce une réforme des retraites", "excerpt": "Le président a présenté son projet de loi sur les retraites."},
        {"id": "2", "title": "Retraites : les syndicats appellent à la grève", "excerpt": "Une journée de mobilisation nationale est prévue."},
        {"id": "3", "title": "Le climat se réchauffe plus vite que prévu", "excerpt": "Les scientifiques alertent sur l'accélération du changement climatique."},
        {"id": "4", "title": "COP28 : les négociations sur le climat s'intensifient", "excerpt": "Les pays tentent de trouver un accord sur les énergies fossiles."},
        {"id": "5", "title": "Économie : la BCE maintient ses taux", "excerpt": "La banque centrale européenne a décidé de ne pas modifier ses taux directeurs."},
    ]
    
    result = cluster_articles.remote(sample_articles)
    print("Clustering result:")
    print(f"  Total articles: {result['totalArticles']}")
    print(f"  Clustered: {result['clusteredArticles']}")
    print(f"  Clusters: {len(result['clusters'])}")
    for cluster in result['clusters']:
        print(f"    - {cluster['topicName']}: {cluster['size']} articles, keywords: {cluster['keywords']}")
