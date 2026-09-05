/** Auth JWT Supabase sur les routes sensibles (PEN-021 SEC-001). */
import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

// Lazy : les imports ESM sont évalués AVANT dotenv.config() de server.ts.
// Le client est donc créé à la première requête, pas au chargement du module.
let verifier: ReturnType<typeof createClient> | null = null;
let verifierTried = false;

function getVerifier() {
  if (!verifier && !verifierTried) {
    verifierTried = true;
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (url && anonKey) verifier = createClient(url, anonKey);
  }
  return verifier;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const client = getVerifier();
  if (!token || !client) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
    return;
  }
  (req as any).user = { id: data.user.id, email: data.user.email } as AuthenticatedUser;
  next();
}
