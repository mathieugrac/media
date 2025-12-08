# LLM-Based Clustering

## Overview

This implementation uses LLM semantic topic extraction (Groq Llama 3.3 70B) to identify trending topics from news articles.

## How It Works

1. **Groq Llama 3.3 70B** analyzes all articles semantically
2. Identifies topics covered by **at least 2 different sources**
3. Returns clusters with descriptive labels

## Key Features

✅ **Semantic understanding** - Groups articles by meaning, not just keywords  
✅ **Multi-source filtering** - Only shows topics covered by 2+ sources  
✅ **Better labels** - Descriptive sentences like "Syrie : un an après la chute d'Assad"  
✅ **Zero cost** - Uses free Groq API

## Files

- `lib/clustering/llm-clusterer.ts` - LLM-based clustering implementation
- `lib/clustering/index.ts` - Main clustering module

## Configuration

Make sure `GROQ_API_KEY` is set in `.env.local`:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

Get a free API key at: https://console.groq.com

## Cost

- **Groq Llama 3.3 70B**: Free (generous rate limits)

## Testing

1. Make sure `GROQ_API_KEY` is set in `.env.local`
2. Restart your dev server: `npm run dev`
3. Visit `/topics` page
4. Check server logs for "Clustering X articles with LLM..."

## Expected Results

You should see topics like:

- "Syrie : un an après la chute d'Assad — Plusieurs médias analysent..."
- "Extrême droite / RN — Enquêtes sur les liens néofascistes..."
- "Guerre en Ukraine et tensions avec la Russie — Sommet européen..."

## Troubleshooting

### "Error during LLM clustering"

- Check `GROQ_API_KEY` is set correctly
- Check Groq API status: https://status.groq.com

### No topics returned

- Make sure you have articles from at least 2 different sources
- LLM requires at least 3 articles total
- Check server logs for detailed error messages

### Rate limits

- Groq has generous free limits
- If you hit limits, you'll see an error in the logs
- Consider adding caching for production use
