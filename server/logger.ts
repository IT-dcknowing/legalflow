/** Logger structuré JSON (PEN-023). Authorization jamais loggée (redact). */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.Authorization', '*.token', '*.password'],
    censor: '***',
  },
});
