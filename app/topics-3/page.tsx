import { TopicsClient } from "@/components/topics-3/topics-client";

export const metadata = {
  title: "Topics 3 | Médias Indépendants",
  description: "Analyse par embeddings locaux + LLM (Groq vs Claude)",
};

export default function Topics3Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <TopicsClient />
    </main>
  );
}
