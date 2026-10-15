/**
 * RC recovery pull — paste this into the browser console on app.lsatlab.com.
 *
 * Fetches the answer choices and prompt for every RC question the bank is
 * missing, and POSTs each batch to the local sink so nothing has to be copied
 * by hand. Start the sink first:
 *
 *     node scripts/rc-recovery-sink.mjs
 *
 * Then open https://app.lsatlab.com (any page, while signed in), open the
 * console, paste this whole file, and press Enter. Watch progress with
 * `__rcPull` — it prints a line every 25 questions. Safe to re-run: the sink
 * hands out only the ids it has not already stored, so an interrupted run
 * resumes where it stopped rather than starting over.
 */
window.__rcPull = { done: 0, ok: 0, fail: 0, errors: [], running: true };

(async () => {
  const SINK = 'http://127.0.0.1:8791';
  const LETTER = ['A', 'B', 'C', 'D', 'E'];
  const s = window.__rcPull;

  const { ids } = await (await fetch(`${SINK}/ids`)).json();
  s.total = ids.length;
  console.log(`[rc-pull] ${ids.length} questions to fetch`);

  const queue = [...ids];
  let buffer = [];

  const flush = async () => {
    if (!buffer.length) return;
    const batch = buffer;
    buffer = [];
    await fetch(`${SINK}/chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    console.log(`[rc-pull] ${s.done}/${s.total} (ok ${s.ok}, fail ${s.fail})`);
  };

  const one = async (id) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const r = await fetch(`/api/questions/${id}`, { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const q = (await r.json()).question;
        if (!q || !Array.isArray(q.answers) || !q.answers.length) throw new Error('no answers');

        const counts = [q.a, q.b, q.c, q.d, q.e].map((n) => Number(n) || 0);
        const sum = counts.reduce((a, b) => a + b, 0);
        const answers = q.answers
          .slice()
          .sort((x, y) => (x.position || 0) - (y.position || 0))
          .map((a, i) => {
            const idx = a.position ? a.position - 1 : i;
            return {
              letter: LETTER[idx] || LETTER[i],
              text: a.text || '',
              correct: !!a.correct,
              response_count: counts[idx] ?? 0,
              percent: sum ? Math.round(((counts[idx] ?? 0) / sum) * 100) : null,
            };
          });
        if (answers.length !== 5) throw new Error(`${answers.length} choices`);
        if (answers.filter((a) => a.correct).length !== 1) throw new Error('no single credited choice');

        return {
          question_id: id,
          preptest: q.ptnumber != null ? Number(q.ptnumber) : null,
          position: q.position ?? null,
          passage_id: q.infoquestionid ?? null,
          questiontext: q.questiontext || '',
          correctanswer: q.correctanswer ?? null,
          total_responses: sum,
          answers,
        };
      } catch (err) {
        if (attempt === 2) {
          s.errors.push(`${id}: ${err.message}`);
          return null;
        }
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
    }
    return null;
  };

  // Four at a time with a short gap: fast enough to finish in about a minute,
  // gentle enough that it never looks like a hammering.
  const worker = async () => {
    while (queue.length) {
      const row = await one(queue.shift());
      s.done += 1;
      if (row) {
        s.ok += 1;
        buffer.push(row);
      } else {
        s.fail += 1;
      }
      if (buffer.length >= 25) await flush();
      await new Promise((res) => setTimeout(res, 120));
    }
  };

  await Promise.all(Array.from({ length: 4 }, worker));
  await flush();
  s.running = false;
  console.log(`[rc-pull] DONE — ${s.ok} stored, ${s.fail} failed`);
  if (s.errors.length) console.log('[rc-pull] errors:', s.errors);
})().catch((e) => {
  window.__rcPull.running = false;
  window.__rcPull.fatal = String(e);
  console.error('[rc-pull] fatal', e);
});
