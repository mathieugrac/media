import { Suspense } from "react";
import Topics5Client from "@/components/topics-5/topics-client";

export const metadata = {
  title: "Topics 5 | Médias Indépendants",
  description: "HDBSCAN clustering + LLM labeling (inspiré de La Trame/BERTopic)",
};

export default function Topics5Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="text-center py-12 text-muted-foreground">
            Chargement...
          </div>
        }
      >
        <Topics5Client />
      </Suspense>
    </main>
  );
}
