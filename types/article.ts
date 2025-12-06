export interface Article {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  publicationDate: Date;
  source: string;
  sourceUrl: string;
  url: string;
  tags?: string[];
}

export interface MediaSource {
  name: string;
  rssUrl: string;
  baseUrl: string;
}
