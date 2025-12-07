import { Article } from "./article";

export interface ClusteredDay {
  dateKey: string;
  date: Date;
  clusters: Cluster[];
}

export interface Cluster {
  id: string;
  topicLabel: string;
  articles: Article[];
}

