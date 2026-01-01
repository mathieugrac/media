import { loadArticles } from "@/lib/storage";

async function check() {
  const articles = await loadArticles();
  const withSubject = articles.filter((a) => a.subject);
  
  console.log("=== ALL 50 SUBJECTS ===\n");
  
  withSubject.forEach((a, i) => {
    console.log(`${i + 1}. SUBJECT: ${a.subject}`);
    console.log(`   DOMAIN: ${a.domain}`);
    console.log(`   TITLE: ${a.title.slice(0, 80)}...`);
    console.log("");
  });
}

check();

