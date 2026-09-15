/**
 * Enveloppe tâche uniforme (contrat DC ↔ Legal Flow).
 * Aujourd'hui : exécution inline + statut 'done' immédiat.
 * Demain (worker Cloud Tasks/PubSub) : 'queued' puis résultat — même contrat,
 * DC interroge lf_task_result dans les deux cas.
 */
function doneEnvelope(taskId, type, result) {
  return { taskId, type, status: 'done', result, at: Date.now() };
}

function queuedEnvelope(taskId, type, hint) {
  return { taskId, type, status: 'queued', hint: hint || 'Interrogez lf_task_result.', at: Date.now() };
}

async function createTask(db, adminTimeout, type, input, runInline) {
  const ref = await db.collection('mcp_tasks').add({
    type, input: input || {}, status: 'queued', createdAt: Date.now(),
  });
  if (!runInline) return queuedEnvelope(ref.id, type);
  try {
    const result = await runInline();
    await ref.update({ status: 'done', result, doneAt: Date.now() });
    return doneEnvelope(ref.id, type, result);
  } catch (e) {
    const error = e && e.message ? e.message : String(e);
    await ref.update({ status: 'error', error, doneAt: Date.now() });
    return { taskId: ref.id, type, status: 'error', error, at: Date.now() };
  }
}

async function getTaskResult(db, adminTimeout, taskId) {
  const snap = await db.collection('mcp_tasks').doc(String(taskId)).get();
  if (!snap.exists) return { taskId, status: 'unknown', error: 'Tâche introuvable.' };
  const d = snap.data() || {};
  return { taskId, type: d.type || null, status: d.status || 'queued', result: d.result || null, error: d.error || null, at: d.doneAt || d.createdAt || null };
}

module.exports = { doneEnvelope, queuedEnvelope, createTask, getTaskResult };
