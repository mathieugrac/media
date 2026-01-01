import { loadArticles } from "@/lib/storage";

async function check() {
  const articles = await loadArticles();
  const withSubject = articles.filter((a) => a.subject);

  console.log(`Total articles: ${articles.length}`);
  console.log(`With subject: ${withSubject.length}\n`);

  if (withSubject.length === 0) {
    console.log("No articles with subjects found.");
    return;
  }

  console.log("=== SUBJECTS ===\n");

  withSubject.slice(0, 50).forEach((a, i) => {
    console.log(`${i + 1}. SUBJECT: ${a.subject}`);
    console.log(`   DOMAIN: ${a.domain}`);
    console.log(`   TITLE: ${a.title.slice(0, 70)}...`);
    console.log("");
  });
}

check().catch(console.error);
