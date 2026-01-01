/**
 * Debug script to understand why Stories page is empty
 */

import { loadArticles } from "@/lib/storage";

async function debug() {
  const articles = await loadArticles();
  
  // Only articles with subjects
  const withSubject = articles.filter(a => a.subject);
  
  // Last 5 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);
  
  const recentWithSubject = withSubject.filter(a => new Date(a.date) > cutoff);
  
  console.log(`\n=== DEBUG ===`);
  console.log(`Total articles: ${articles.length}`);
  console.log(`With subject: ${withSubject.length}`);
  console.log(`Recent (5 days) with subject: ${recentWithSubject.length}`);
  
  // Show date range of articles with subjects
  if (withSubject.length > 0) {
    const dates = withSubject.map(a => new Date(a.date)).sort((a, b) => b.getTime() - a.getTime());
    console.log(`\nDate range of articles with subjects:`);
    console.log(`  Newest: ${dates[0].toISOString().split('T')[0]}`);
    console.log(`  Oldest: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
    console.log(`  Cutoff: ${cutoff.toISOString().split('T')[0]}`);
  }
  
  // Group recent by subject
  const groups = new Map<string, number>();
  for (const a of recentWithSubject) {
    groups.set(a.subject!, (groups.get(a.subject!) || 0) + 1);
  }
  
  console.log(`\nRecent subjects by count:`);
  [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([subject, count]) => {
      console.log(`  ${count}x ${subject}`);
    });
  
  // Show what would be displayed
  const stories = [...groups.entries()].filter(([, count]) => count >= 3);
  console.log(`\nStories with 3+ articles: ${stories.length}`);
}

debug().catch(console.error);

