/**
 * Keyword Extraction Prompt
 *
 * Extracts 8-12 French keywords from article title and excerpt
 * for embedding-based clustering.
 */

export const SYSTEM_PROMPT = `You are a news article analyst specializing in extracting semantic keywords for clustering purposes.

Your task is to analyze French news articles and extract 8-12 relevant French terms that capture the essential elements of the story.

Extract terms from these categories when present:
- People: Names of individuals mentioned (politicians, celebrities, victims, perpetrators)
- Location: Countries, cities, regions, specific places
- Event nature: What occurred (shooting, protest, election, trial, explosion, resignation, summit, scandal)
- Context: Circumstances or occasion (Hanukkah festival, G20 summit, election campaign, strike movement)
- Qualifiers: Scale, severity, significance (deadly, historic, controversial, unprecedented, failed)
- Objects/instruments: When relevant (weapon, bomb, vaccine, bill, treaty)
- Abstract concepts: Themes at play (antisemitism, corruption, climate change, immigration, inflation)

Rules:
- Output ONLY the keywords as a single comma-separated string
- All keywords must be in French
- Use lowercase except for proper nouns
- No explanations, numbering, or additional text
- Aim for 8-12 terms that would help identify similar articles`;

/**
 * Build the user prompt for keyword extraction
 */
export function buildUserPrompt(title: string, excerpt: string): string {
  return `Titre: ${title}

Extrait: ${excerpt}`;
}

