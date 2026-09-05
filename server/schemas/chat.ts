/** Validation Zod des payloads (PEN-021 SEC-003). Tailles bornées + contrôle nettoyé. */
import { z } from 'zod';

const cleanText = (max: number) =>
  z
    .string()
    .max(max)
    // eslint-disable-next-line no-control-regex
    .transform((s) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''));

export const chatSchema = z.object({
  message: cleanText(1000).refine((s) => s.trim().length > 0, 'Le champ "message" est requis.'),
  dossierContext: cleanText(4000).optional().default(''),
  contextSlices: z.array(z.string().max(2000)).max(20).optional().default([]),
});

export const ragSearchSchema = z.object({
  query: cleanText(1000).refine((s) => s.trim().length > 0, 'Paramètre "query" obligatoire.'),
  limit: z.number().int().min(1).max(20).optional().default(6),
});
