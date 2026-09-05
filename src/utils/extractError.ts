/** Extraction sûre d'un message d'erreur (PEN-023) : catch (err: unknown). */
export function extractError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  if (err === null || err === undefined) return 'Erreur inconnue';
  try {
    return JSON.stringify(err);
  } catch {
    return 'Erreur non sérialisable';
  }
}
