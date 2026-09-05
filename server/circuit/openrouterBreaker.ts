/** Circuit breaker OpenRouter (PEN-026) : fallback instantané si le circuit est ouvert. */
import CircuitBreaker from 'opossum';
import { logger } from '../logger';
import { fetchWithTimeout } from '../util/withTimeout';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TIMEOUT_MS = 12000;

export interface OpenRouterCall {
  systemPrompt: string;
  message: string;
}

async function callOpenRouter(vars: OpenRouterCall): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const res = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://legalflow.ci',
        'X-Title': 'Legal Flow CI - Assistant Fiscal & Juridique',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m3:free',
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: vars.systemPrompt },
          { role: 'user', content: vars.message },
        ],
      }),
    },
    OPENROUTER_TIMEOUT_MS
  );
  if (!res.ok) {
    logger.warn({ status: res.status }, 'OpenRouter HTTP non-OK');
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }
  const data = (await res.json()) as any;
  const reply = data?.choices?.[0]?.message?.content;
  return typeof reply === 'string' && reply ? reply : null;
}

export const openrouterBreaker = new CircuitBreaker(callOpenRouter, {
  timeout: OPENROUTER_TIMEOUT_MS + 2000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

openrouterBreaker.on('open', () => logger.warn('Circuit OpenRouter OUVERT : fallback instantané.'));
openrouterBreaker.on('halfOpen', () => logger.info('Circuit OpenRouter half-open : test en cours.'));
openrouterBreaker.on('close', () => logger.info('Circuit OpenRouter FERMÉ : reprise normale.'));

export function breakerState(): string {
  try {
    const s = openrouterBreaker as unknown as { opened?: boolean; halfOpen?: boolean };
    if (s.opened) return 'open';
    if (s.halfOpen) return 'half-open';
    return 'closed';
  } catch {
    return 'unknown';
  }
}
