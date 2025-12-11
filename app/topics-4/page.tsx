import { TopicsClient } from "@/components/topics-4/topics-client";

export const metadata = {
  title: "Topics 4 | Médias Indépendants",
  description: "Analyse par groupement LLM pur (Groq vs Claude Haiku)",
};

export default function Topics4Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <TopicsClient />
    </main>
  );
}
