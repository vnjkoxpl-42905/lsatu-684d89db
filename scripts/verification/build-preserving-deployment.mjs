// Wrap reviewed additive SQL in one transaction. No record export or backfill.
// Original column values and row multiplicity must survive byte-for-byte.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function preservingDeployment(artifact, tables) {
  const artifacts=Array.isArray(artifact)?artifact:[artifact];
  if (!artifacts.length || artifacts.some(sql => !/^\s*(?:--[^\n]*\n)*\s*begin;/i.test(sql) || !/commit;\s*$/i.test(sql))) throw new Error('Expected explicit artifact transactions');
  if (!tables.length || tables.some(name => !/^[a-z_][a-z0-9_]*$/.test(name))) throw new Error('Invalid preservation tables');
  const body = artifacts.map(sql => sql.replace(/\bbegin;/i, '').replace(/commit;\s*$/i, '')).join('\n');
  const names = tables.map(name => `'${name}'`).join(',');
  const measure = `select count(*), md5(coalesce(string_agg(row_hash, '' order by row_hash), ''))
    from (select md5((select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(t)) where key=any($1))::text) as row_hash
      from public.%I t) measured`;
  return `begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
lock table ${[...tables].sort().map(name => `public.${name}`).join(',')} in share row exclusive mode;
create temporary table deployment_preservation_v1(table_name text primary key, columns text[], row_count bigint, digest text) on commit drop;
do $preserve$ declare n text; c text[]; total bigint; fingerprint text; begin
  foreach n in array array[${names}] loop
    select array_agg(attname::text order by attnum) into c from pg_attribute
      where attrelid=format('public.%I',n)::regclass and attnum>0 and not attisdropped;
    execute format($measure$${measure}$measure$,n) into total,fingerprint using c;
    insert into deployment_preservation_v1 values(n,c,total,fingerprint);
  end loop;
end $preserve$;
${body}
do $preserve$ declare saved record; total bigint; fingerprint text; begin
  for saved in select * from deployment_preservation_v1 loop
    execute format($measure$${measure}$measure$,saved.table_name) into total,fingerprint using saved.columns;
    if total is distinct from saved.row_count or fingerprint is distinct from saved.digest then
      raise exception 'Original records changed in %; deployment aborted',saved.table_name;
    end if;
  end loop;
end $preserve$;
select table_name,row_count,digest,true as original_values_preserved from deployment_preservation_v1 order by table_name;
commit;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'))) {
  const [input, output, ...tables] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: input.sql output.sql table...');
  await writeFile(output, preservingDeployment(await Promise.all(input.split('+').map(path=>readFile(path,'utf8'))),tables));
  console.log(JSON.stringify({output,tables,recordExport:false}));
}
