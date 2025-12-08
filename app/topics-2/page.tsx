import { TopicsClient } from "@/components/topics-2/topics-client";

export const metadata = {
  title: "Topics 2 | Médias Indépendants",
  description: "Analyse LLM des sujets d'actualité du jour",
};

export default function Topics2Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <TopicsClient />
    </main>
  );
}
