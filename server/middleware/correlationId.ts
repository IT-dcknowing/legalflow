/** Correlation-id par requête (PEN-023). */
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './requireAuth';

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  (req as AuthenticatedRequest).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
