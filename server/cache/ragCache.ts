/** Cache LRU des requêtes RAG récurrentes (PEN-026) : 200 entrées, TTL 1h. */
import { LRUCache } from 'lru-cache';

export interface RagCacheEntry {
  reply: string;
  sources: unknown[];
  model: string;
  contextSlices: unknown[];
  isFallback: boolean;
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function ragCacheKey(question: string, entrepriseId = ''): string {
  const norm = question.trim().toLowerCase().replace(/\s+/g, ' ');
  return djb2(`${norm}::${entrepriseId}`);
}

export const ragCache = new LRUCache<string, RagCacheEntry>({ max: 200, ttl: 1000 * 60 * 60 });
