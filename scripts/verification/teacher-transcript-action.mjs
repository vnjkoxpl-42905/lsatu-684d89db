import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const moduleArgument = (flag) => {
  const position = process.argv.indexOf(flag);
  return position < 0 ? undefined : process.argv[position + 1];
};
const postgresModule = moduleArgument('--postgres-module');
let openPostgresConnection;
const db = await (async () => {
  if (!postgresModule) {
    const pgliteModule = moduleArgument('--pglite-module');
    if (!pgliteModule) throw new Error('Pass --pglite-module with the absolute path to PGlite.');
    const { PGlite } = await import(pathToFileURL(resolve(pgliteModule)).href);
    return new PGlite();
  }

  const port = Number(moduleArgument('--postgres-port'));
  if (!Number.isInteger(port) || port < 49152 || port > 65535 || process.argv.includes('--serve')) {
    throw new Error('Pass --postgres-port for an isolated PostgreSQL test cluster. This mode runs tests only.');
  }
  const { default: { Client } } = await import(pathToFileURL(resolve(postgresModule)).href);
  openPostgresConnection = async () => {
    const client = new Client({
      connectionString: `postgresql://postgres@127.0.0.1:${port}/teacher_transcript_fixture`,
      connectionTimeoutMillis: 5000, statement_timeout: 10000,
    });
    await client.connect();
    return client;
  };
  const client = await openPostgresConnection();
  try {
    const { rows: [state] } = await client.query(`
      select not exists (
        select from pg_namespace where nspname not in ('information_schema','public') and nspname not like 'pg_%'
      ) and not exists (
        select from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
      ) as empty
    `);
    if (!state.empty) throw new Error('PostgreSQL proof requires an empty teacher_transcript_fixture database.');
    return { query: client.query.bind(client), exec: client.query.bind(client), close: client.end.bind(client) };
  } catch (error) {
    await client.end();
    throw error;
  }
})();
const text = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const first = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const call = async (name, ...params) => {
  const individualParameters = params.map((_, index) => '$' + (index + 1)).join(', ');
  return (await first('select public.' + name + '(' + individualParameters + ') as value', params)).value;
};
const signIn = (id) => first("select set_config('request.jwt.claim.sub', $1, false)", [id]);
const teacher = randomUUID();
const otherTeacher = randomUUID();
const student = randomUUID();
const session = randomUUID();
const transcript = randomUUID();

async function linkTranscript(content) {
  const id = randomUUID();
  await db.query('insert into public.student_context values ($1, $2, $3)', [id, student, content.join('\n')]);
  await db.query('insert into public.session_note_ingestions values ($1, $2, $3)', [session, teacher, id]);
  await db.query('update public.student_sessions set transcript_id = $1 where id = $2', [id, session]);
}

async function prepareFromLinkedTranscript() {
  const source = await first(`
    select c.id, c.content_text, exists (
      select from public.session_note_ingestions earlier
      where earlier.session_id = s.id and earlier.actor_id = auth.uid() and earlier.transcript_id <> c.id
    ) as revised
    from public.student_sessions s
    join public.student_context c on c.id = s.transcript_id and c.student_id = s.student_id
    join public.session_note_ingestions i on i.session_id = s.id and i.transcript_id = c.id and i.actor_id = auth.uid()
    join public.fixture_enrollments e on e.teacher_id = auth.uid() and e.student_id = s.student_id
    where s.id = $1 and s.student_id = $2
  `, [session, student]);
  if (!source) throw new Error('No enrolled student with a finalized linked transcript');
  const candidates = new Map();
  for (const line of source.content_text.split(/\r?\n/)) {
    const normalized = line.normalize('NFKC').toLowerCase()
      .replace(/i['’]ll\b/g, 'i will')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const match = /^(?:teacher|tutor|instructor) (i will assign|maybe assign) example student pt ?(\d+) section ([1-4])$/.exec(normalized);
    if (!match) continue;
    const pt = Number(match[2]);
    const section = Number(match[3]);
    const anchor = [match[1], 'homework', pt, section].join(':');
    if (!candidates.has(anchor)) {
      candidates.set(anchor, {
        anchor, pt, section, excerpt: line.trim(), state: match[1].startsWith('maybe') ? 'pin' : 'pending',
      });
    }
  }
  const { rows: prior } = await db.query(`
    select * from public.fixture_actions where teacher_id = auth.uid() and student_id = $1 and session_id = $2
  `, [student, session]);
  const byAnchor = new Map(prior.map(action => [action.matched_anchor ?? action.source_anchor, action]));
  const unmatched = [...candidates.values()].filter(candidate => !byAnchor.has(candidate.anchor));
  const tracked = prior.filter((action) => ['pending', 'pin'].includes(action.state));
  const canonicalAnchor = (action) => action.matched_anchor ?? action.source_anchor;
  const replacements = new Map();
  const ambiguous = new Set();
  for (const candidate of unmatched) {
    const sameTest = tracked.filter((action) => action.pt === candidate.pt);
    const absent = sameTest.filter((action) => !candidates.has(canonicalAnchor(action)));
    let possible = absent.length ? absent : sameTest;
    const sameSourceSection = possible.filter((action) => canonicalAnchor(action).endsWith(':' + candidate.section));
    if (sameSourceSection.length) possible = sameSourceSection;
    const sameIntent = possible.filter((action) =>
      canonicalAnchor(action).startsWith(candidate.state === 'pin' ? 'maybe assign:' : 'i will assign:'),
    );
    if (sameIntent.length) possible = sameIntent;
    if (possible.length === 1) {
      const [owner] = possible;
      replacements.set(owner.id, [...(replacements.get(owner.id) ?? []), candidate]);
    } else {
      for (const action of possible) ambiguous.add(action.id);
    }
  }
  for (const action of tracked) {
    if (action.source_transcript_id === source.id) continue;
    const exact = candidates.get(canonicalAnchor(action));
    const revised = replacements.get(action.id) ?? [];
    const options = revised.length || !exact || ambiguous.has(action.id) ? revised : [exact];
    const changed = !exact || revised.length || ambiguous.has(action.id) || action.conflict;
    const sameOptions = action.conflict &&
      JSON.stringify(action.conflict.revised_excerpts.map(({ anchor }) => anchor)) === JSON.stringify(options.map(({ anchor }) => anchor));
    const conflict = changed ? {
      id: sameOptions ? action.conflict.id : randomUUID(),
      prior_excerpt: action.excerpt,
      revised_excerpts: options,
    } : null;
    const updated = await first(`
      update public.fixture_actions a
        set source_transcript_id = $2, conflict = $3,
            current_revision = case when $3::jsonb is null then a.current_revision else null end
      where a.id = $1 and a.source_transcript_id = $4 and a.state in ('pending', 'pin')
        and exists(select from public.student_sessions s where s.id = a.session_id and s.transcript_id = $2)
      returning a.*
    `, [action.id, source.id, conflict && JSON.stringify(conflict), action.source_transcript_id]);
    if (updated) byAnchor.set(updated.matched_anchor ?? updated.source_anchor, updated);
  }
  const results = [];
  for (const { anchor, excerpt, pt, section, state } of candidates.values()) {
    const existing = byAnchor.get(anchor);
    if (!existing && source.revised) {
      // A revised target might be a source correction to a task that already has a teacher decision.
      await db.query(`
        insert into public.fixture_action_reconciliation(teacher_id, student_id, session_id, transcript_id, source_anchor, excerpt)
        values(auth.uid(), $1, $2, $3, $4, $5) on conflict do nothing
      `, [student, session, source.id, anchor, excerpt]);
      continue;
    }
    const action = existing ?? await first(`
      insert into public.fixture_actions(teacher_id, student_id, session_id, source_anchor, source_transcript_id, excerpt, pt, section, state)
      values(auth.uid(), $1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (teacher_id, student_id, session_id, source_anchor) do update
        set source_anchor = excluded.source_anchor
      returning *
    `, [student, session, anchor, source.id, excerpt, pt, section, state]);
    if (action.state === 'pending' && !action.current_revision && !action.conflict) {
      try {
        action.preview = await call('fixture_preview', action.id, action.section);
      } catch (error) {
        if (!error.message.includes('Section is not assignable')) throw error;
      }
    }
    results.push(action);
  }
  return results;
}

async function serveFixture() {
  const allowedOrigins = new Set(['http://127.0.0.1:8080', 'http://127.0.0.1:8092']);
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const reply = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    if (req.headers.host !== '127.0.0.1:8796' || (origin && !allowedOrigins.has(origin))) {
      return reply(403, { error: 'This fixture only accepts the local review app.' });
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return reply(204);
    try {
      if (req.method === 'GET' && req.url === '/actions') {
        const { rows } = await db.query(`
          select a.id, a.student_id, a.excerpt, a.pt, a.section, a.state, a.receipt, a.conflict,
            array(select c.section from public.fixture_sections c
              join public.homework_sets s on s.id = c.set_id
              where c.pt = a.pt and c.active order by c.section) available_sections,
                 'Example Student' as student_name, to_jsonb(p) as preview
          from public.fixture_actions a left join public.fixture_previews p on p.id = a.current_revision
          where a.teacher_id = auth.uid() and a.state <> 'dismissed' order by a.state = 'pin', a.excerpt
        `);
        return reply(200, { actions: rows });
      }
      const readBack = /^\/assignments\/([0-9a-f-]{36})$/.exec(req.url);
      if (req.method === 'GET' && readBack) {
        const result = await first(`
          select a.id, a.set_title, cardinality(a.question_qids) question_count,
            (select count(*)::int from public.notifications n
             join public.assignment_delivery_events e on e.id = n.assignment_event_id
             where e.source_id = a.id and n.user_id = a.student_id) notification_count
          from public.homework_assignments a where a.id = $1 and a.student_id = $2
        `, [readBack[1], student]);
        return result ? reply(200, result) : reply(404, { error: 'No assignment exists.' });
      }
      const route = /^\/actions\/([0-9a-f-]{36})\/(preview|execute|dismiss|resolve)$/.exec(req.url);
      const revise = req.url === '/transcript/revise';
      if (req.method !== 'POST' || (!route && !revise)) return reply(404, { error: 'Unknown fixture route.' });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1024) return reply(413, { error: 'Request is too large.' });
      }
      const input = JSON.parse(body);
      if (revise) {
        if (!['tentative', 'section'].includes(input.variant)) return reply(400, { error: 'Choose a fixture revision.' });
        await linkTranscript([input.variant === 'tentative'
          ? 'Teacher: Maybe assign Example Student PT 110, section 3.'
          : 'Teacher: I will assign Example Student PT 110, section 2.',
          'Teacher: Maybe assign Example Student PT 110, section 1.']);
        await prepareFromLinkedTranscript();
        return reply(200, { revised: true });
      }
      if (route[2] === 'resolve') {
        if (typeof input.conflictId !== 'string' || !/^[0-9a-f-]{36}$/.test(input.conflictId) ||
            !['keep', 'revised'].includes(input.choice) ||
            (input.choice === 'revised' && !Number.isInteger(input.revisedIndex))) {
          return reply(400, { error: 'Choose how to resolve the current conflict.' });
        }
        return reply(200, await call('fixture_resolve_source', route[1], input.conflictId, input.choice, input.revisedIndex ?? null));
      }
      if (route[2] === 'dismiss') return reply(200, await call('fixture_dismiss', route[1]));
      if (route[2] === 'preview') {
        if (!Number.isInteger(input.section) || input.section < 1 || input.section > 4) {
          return reply(400, { error: 'Choose a section from 1 through 4.' });
        }
        return reply(200, await call('fixture_preview', route[1], input.section));
      }
      if (typeof input.revision !== 'string' || !/^[0-9a-f-]{36}$/.test(input.revision)) {
        return reply(400, { error: 'Choose a valid preview before executing.' });
      }
      return reply(200, await call('fixture_execute', route[1], input.revision));
    } catch {
      return reply(409, { error: 'The action could not be applied. Reload the current preview.' });
    }
  });
  await new Promise((ready, reject) => server.listen(8796, '127.0.0.1', ready).once('error', reject));
  console.log('Teacher transcript fixture on http://127.0.0.1:8796');
  await new Promise((resolve) => {
    const stop = () => server.close(resolve);
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}

async function waitForPostgresBlock(blocker, waiting) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const state = await first('select $1 = any(pg_blocking_pids($2)) as blocked', [blocker, waiting]);
    if (state.blocked) return;
    await delay(20);
  }
  assert.fail('The competing approval did not block on the first PostgreSQL transaction within 5 seconds.');
}

async function proveConcurrentRelink(actionId, revisionId, lines) {
  const connection = await openPostgresConnection();
  let pending;
  let transactionOpen = false;
  try {
    await connection.query("select set_config('request.jwt.claim.sub', $1, false)", [teacher]);
    const { rows: [otherBackend] } = await connection.query('select pg_backend_pid() as pid');
    const firstBackend = await first('select pg_backend_pid() as pid');
    await db.query('begin');
    transactionOpen = true;
    await linkTranscript(lines);
    pending = connection.query('select public.fixture_execute($1, $2) as value', [actionId, revisionId]);
    void pending.catch(() => {});
    await waitForPostgresBlock(firstBackend.pid, otherBackend.pid);
    await db.query('commit');
    transactionOpen = false;
    await assert.rejects(pending, /Transcript changed/);
    console.log('PASS: PostgreSQL approval waited for a concurrent relink and rejected the old revision.');
  } finally {
    if (transactionOpen) await db.query('rollback');
    if (pending) await pending.catch(() => {});
    await connection.end();
  }
}

async function proveConcurrentExecution(actionId, revisionId) {
  const otherConnection = await openPostgresConnection();
  let pending;
  let transactionOpen = false;
  try {
    await otherConnection.query("select set_config('request.jwt.claim.sub', $1, false)", [teacher]);
    const { rows: [otherBackend] } = await otherConnection.query('select pg_backend_pid() as pid');
    const firstBackend = await first('select pg_backend_pid() as pid');
    assert.notEqual(firstBackend.pid, otherBackend.pid);

    await db.query('begin');
    transactionOpen = true;
    const expected = await call('fixture_execute', actionId, revisionId);
    pending = otherConnection.query('select public.fixture_execute($1, $2) as value', [actionId, revisionId]);
    // Observe the second backend blocked by our uncommitted execution before releasing it.
    void pending.catch(() => {});
    await waitForPostgresBlock(firstBackend.pid, otherBackend.pid);
    await db.query('commit');
    transactionOpen = false;
    assert.deepEqual((await pending).rows[0].value, expected);
    console.log('PASS: distinct PostgreSQL processes contended on one execution and returned the same receipt.');
  } finally {
    if (transactionOpen) await db.query('rollback');
    if (pending) await pending.catch(() => {});
    await otherConnection.end();
  }
}

async function verify(registered) {
  await signIn(otherTeacher);
  await assert.rejects(prepareFromLinkedTranscript, /No enrolled student/);
  await signIn(teacher);
  await db.query('update public.fixture_sections set active = false where pt = 110 and section = 3');
  const [unresolved, availablePin] = await prepareFromLinkedTranscript();
  assert.equal(unresolved.preview, undefined);
  assert.equal(availablePin.state, 'pin');
  await db.query('update public.fixture_sections set active = true where pt = 110 and section = 3');
  const [action, pin] = await prepareFromLinkedTranscript();
  assert.equal(action.id, unresolved.id);
  assert.equal(action.preview.section, 3);
  assert.equal(pin.state, 'pin');
  assert.equal(pin.current_revision, null);
  await assert.rejects(call('fixture_execute', pin.id, null), /Preview changed/);
  let corrected = await call('fixture_preview', action.id, 2);
  assert.equal(corrected.student_id, student);
  assert.equal(corrected.title, 'PT 110, section 2');
  assert.notEqual(corrected.id, action.preview.id);
  await assert.rejects(call('fixture_execute', action.id, action.preview.id), /Preview changed/);
  await signIn(otherTeacher);
  await assert.rejects(call('fixture_execute', action.id, corrected.id), /Not your task/);
  await signIn(teacher);
  await db.query('delete from public.fixture_enrollments where teacher_id = $1 and student_id = $2', [teacher, student]);
  await assert.rejects(call('fixture_execute', action.id, corrected.id), /enrollment changed/);
  await db.query('insert into public.fixture_enrollments values ($1, $2)', [teacher, student]);
  assert.equal((await first('select count(*)::integer as n from public.homework_assignments')).n, 0);
  assert.equal((await first('select count(*)::integer as n from public.notifications')).n, 0);

  await linkTranscript([
    'Tutor: I’ll assign Example Student PT110, section 3!',
    'Student: I will assign Example Student PT 110, section 4.',
    'Teacher: I will assign Example Student PT 111, section 2.',
    'Tutor: I will assign Example Student PT 111, section 1.',
    'Instructor: Maybe assign Example Student PT 110; section 1?',
    'Teacher: I will assign Example Student PT 110, section 3.',
  ]);
  const redelivered = await prepareFromLinkedTranscript();
  assert.equal(redelivered[0].id, action.id);
  assert.equal(redelivered[0].section, 2);
  assert.equal(redelivered[1].state, 'pin');
  assert.equal(redelivered.length, 2);
  const holds = await db.query('select source_anchor from public.fixture_action_reconciliation order by source_anchor');
  assert.deepEqual(holds.rows.map((hold) => hold.source_anchor), [
    'i will assign:homework:111:1',
    'i will assign:homework:111:2',
  ]);
  assert.equal(redelivered[0].current_revision, corrected.id);
  assert.equal(redelivered[1].id, pin.id);
  assert.equal((await first('select count(*)::integer as n from public.fixture_actions')).n, 2);

  for (const [revisedLine, choice, retainPrior] of [
    ['Teacher: Maybe assign Example Student PT 110, section 3.', 'keep', false],
    ['Teacher: I will assign Example Student PT 110, section 2.', 'keep', false],
    ['Teacher: I will assign Example Student PT 110, section 2.', 'revised', true],
  ]) {
    const oldRevision = corrected.id;
    const lines = [revisedLine, 'Instructor: Maybe assign Example Student PT 110; section 1?'];
    if (retainPrior) lines.push(action.excerpt);
    if (openPostgresConnection && !retainPrior && choice === 'keep' && revisedLine.includes('Maybe')) {
      await proveConcurrentRelink(action.id, oldRevision, lines);
    } else {
      await linkTranscript(lines);
    }
    await assert.rejects(call('fixture_execute', action.id, oldRevision), /Transcript changed/);
    await prepareFromLinkedTranscript();
    const suspended = await first('select id, section, conflict, current_revision from public.fixture_actions where id = $1', [action.id]);
    assert.equal(suspended.id, action.id);
    assert.equal(suspended.section, 2);
    assert.equal(suspended.current_revision, null);
    assert.match(suspended.conflict.prior_excerpt, /section 3/);
    assert.equal(suspended.conflict.revised_excerpts[0].excerpt, revisedLine);
    const unchangedPin = await first('select state, conflict from public.fixture_actions where id = $1', [pin.id]);
    assert.deepEqual(unchangedPin, { state: 'pin', conflict: null });
    await assert.rejects(call('fixture_execute', action.id, oldRevision), /Preview changed/);
    await assert.rejects(call('fixture_preview', action.id, 2), /Resolve the transcript conflict first/);
    assert.equal((await first('select count(*)::integer as n from public.homework_assignments')).n, 0);
    assert.equal((await first('select count(*)::integer as n from public.notifications')).n, 0);

    const resolved = await call('fixture_resolve_source', action.id, suspended.conflict.id, choice, choice === 'keep' ? null : 0);
    assert.equal(resolved.id, action.id);
    assert.equal(resolved.section, 2);
    assert.equal(resolved.conflict, null);
    assert.notEqual(resolved.current_revision, oldRevision);
    await assert.rejects(call('fixture_execute', action.id, oldRevision), /Preview changed/);
    corrected = await first('select * from public.fixture_previews where id = $1', [resolved.current_revision]);
    await prepareFromLinkedTranscript();
    assert.equal((await first('select conflict from public.fixture_actions where id = $1', [action.id])).conflict, null);
  }
  const promoted = await call('fixture_preview', pin.id, 1);
  assert.equal(promoted.action_id, pin.id);
  await call('fixture_dismiss', pin.id);
  await assert.rejects(call('fixture_execute', pin.id, promoted.id), /Preview changed/);
  await linkTranscript(['Teacher: I will assign Example Student PT 110, section 2.',
    'Instructor: Maybe assign Example Student PT 110, section 1.']);
  await prepareFromLinkedTranscript();
  console.log('PASS: transcript revisions suspend old approvals before and after extraction; explicit resolution preserves the action ID and requires a fresh approval.');

  await db.query('update public.fixture_sections set active = false where pt = 110 and section = 2');
  await assert.rejects(call('fixture_execute', action.id, corrected.id), /Section changed/);
  await db.query('update public.fixture_sections set active = true where pt = 110 and section = 2');

  // Inject a delivery failure at the real notification table. The native assignment,
  // its Classroom mirror, the existing writer receipt, and approval all roll back.
  await db.exec(`
    alter table public.notifications add constraint reject_fixture_notification check (false);
  `);
  await assert.rejects(call('fixture_execute', action.id, corrected.id), /reject_fixture_notification/);
  assert.equal((await first('select count(*)::integer as n from public.homework_assignments')).n, 0);
  assert.equal((await first('select count(*)::integer as n from public.classroom_items')).n, 0);
  assert.equal((await first('select count(*)::integer as n from public.mcp_write_audit')).n, 0);
  const rolledBack = await first('select state, receipt from public.fixture_actions where id = $1', [action.id]);
  assert.deepEqual(rolledBack, { state: 'pending', receipt: null });
  await db.exec('alter table public.notifications drop constraint reject_fixture_notification');

  // Simulate a lost response by discarding the first result, then read the
  // committed receipt before retrying. PGlite serializes queries on this connection.
  if (openPostgresConnection) {
    await proveConcurrentExecution(action.id, corrected.id);
  } else {
    await call('fixture_execute', action.id, corrected.id);
  }
  const saved = await first('select receipt from public.fixture_actions where id = $1', [action.id]);
  const receipt = saved.receipt;
  assert.ok(receipt.assignment_id);
  const repeat = await call('fixture_execute', action.id, corrected.id);
  assert.deepEqual(repeat, receipt);
  assert.equal(receipt.notified, true);
  assert.equal(receipt.route, '/classroom/' + receipt.assignment_id);
  assert.equal((await first('select count(*)::integer as n from public.homework_assignments')).n, 1);
  await signIn(student);
  const assignment = await call('student_work_state', 'homework_assignments', receipt.assignment_id, student);
  assert.equal(assignment.title, corrected.title);
  assert.equal(assignment.available, true);
  assert.equal(assignment.link, receipt.route);
  const assignedQuestions = await first('select question_qids from public.homework_assignments where id = $1 and student_id = auth.uid()', [receipt.assignment_id]);
  assert.deepEqual(assignedQuestions.question_qids, registered.find((entry) => entry.definition.section === 2).definition.qids);
  const notices = await db.query('select type, link from public.notifications where user_id = auth.uid()');
  assert.deepEqual(notices.rows, [{ type: 'assignment', link: receipt.route }]);
  assert.equal((await first('select count(*)::integer as n from public.messages')).n, 1);
  await signIn(teacher);
  const done = await prepareFromLinkedTranscript();
  assert.equal(done[0].state, 'done');
  assert.equal(done[0].receipt.assignment_id, receipt.assignment_id);
  assert.equal(done[1].id, pin.id);
  assert.equal(done[1].state, 'dismissed');
  await assert.rejects(call('fixture_preview', pin.id, 1), /Action is closed/);
  assert.equal((await first('select count(*)::integer as n from public.homework_assignments')).n, 1);
  assert.equal((await first('select count(*)::integer as n from public.notifications')).n, 1);
  assert.equal((await first('select count(*)::integer as n from public.fixture_actions')).n, 2);
  console.log('PASS: linked and revised transcripts, private pin, corrected approval, stale and wrong-owner rejection, rollback, receipt recovery, sequential retry, dismissal, student read-back, one in-app notification and one inbox message.');
}


try {
  await db.exec(await text('./teacher-transcript-fixture.sql'));
  await db.exec(await text('../../supabase/migrations/20261028140000_student_work_delivery.sql'));
  await db.exec(await text('../../supabase/migrations/20261028141000_student_work_mcp_writers.sql'));
  await db.query('insert into auth.users values ($1), ($2), ($3)', [teacher, otherTeacher, student]);
  await db.query('insert into public.fixture_teachers values ($1), ($2)', [teacher, otherTeacher]);
  await db.query("insert into public.profiles values ($1, 'Example Student')", [student]);
  await db.query('insert into public.fixture_enrollments values ($1, $2)', [teacher, student]);
  await db.query('insert into public.student_context values ($1, $2, $3)', [transcript, student, [
    'Teacher: I will assign Example Student PT 110, section 3.',
    'Student: I will review section 1.',
    'Teacher: Maybe assign Example Student PT 110, section 1.',
  ].join('\n')]);
  await db.query('insert into public.student_sessions values ($1, $2, $3)', [session, student, transcript]);
  await db.query('insert into public.session_note_ingestions values ($1, $2, $3)', [session, teacher, transcript]);
  const catalog = JSON.parse(await text('../../docs/implementation-plans/artifacts/timed-section-all-sections-v2.generated.json'));
  const registered = catalog.sections.filter((entry) => entry.pt === 110);
  for (const { pt, definition } of registered) {
    const set = randomUUID();
    await db.query('insert into public.homework_sets values ($1, $2, null, $3, null)', [
      set, 'PT ' + pt + ', section ' + definition.section, definition.qids,
    ]);
    await db.query('insert into public.fixture_sections(pt, section, set_id) values ($1, $2, $3)', [pt, definition.section, set]);
  }
  await db.query('update public.assignment_delivery_control set enabled = true');
  if (process.argv.includes('--serve')) {
    await signIn(teacher);
    await prepareFromLinkedTranscript();
    await serveFixture();
  } else {
    await verify(registered);
  }
} finally {
  await db.close();
}
