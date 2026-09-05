/** Métriques Prometheus (PEN-034) : latence, compteurs, défauts Node. */
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

export const httpDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Durée des requêtes HTTP en millisecondes',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
  buckets: [25, 50, 100, 250, 500, 1000, 2000, 5000],
});

export const httpTotal = new Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export function metricsMiddleware(req: any, res: any, next: () => void): void {
  const start = Date.now();
  res.on('finish', () => {
    const route: string = req.route?.path || req.path || 'unknown';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpDuration.observe(labels, Date.now() - start);
    httpTotal.inc(labels);
  });
  next();
}
