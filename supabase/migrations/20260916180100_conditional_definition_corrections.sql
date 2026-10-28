-- Correct the definition used for new assignments. Existing assignment snapshots
-- and historical responses are intentionally untouched.
do $correction$
declare
  current_hash text;
  corrections jsonb := '[{"order":47,"prompt":"A juror may review the exhibit log or the testimony transcripts overnight, but not both.","credited_answers":["If a juror reviews the exhibit log overnight, then the juror does not review the testimony transcripts.","If a juror reviews the testimony transcripts, then the juror does not review the exhibit log."],"explanation":"\"Not both\" means each option rules out the other: if the exhibit log is reviewed, the testimony transcripts are not; contraposing gives the opposite exclusion. That is not the converse. Permission to choose either option does not require the juror to choose one.","category":"Not both"},{"order":48,"prompt":"The observatory grants dark-sky certification if and only if every fixture in the district is fully shielded.","credited_answers":["If a district is granted dark-sky certification, then every fixture in it is fully shielded; and if every fixture in it is fully shielded, then a district is granted dark-sky certification.","If not every fixture in it is fully shielded, then a district is not granted dark-sky certification; and if a district is not granted dark-sky certification, then not every fixture in it is fully shielded."],"explanation":"\"If and only if\" gives two directions. Certification requires every fixture to be shielded, and shielding every fixture guarantees certification. A complete diagram must preserve both directions.","category":"Both ways: if and only if"},{"order":57,"prompt":"The only expeditions cleared for the ice shelf carry redundant beacons and a certified glacier medic.","credited_answers":["If an expedition is cleared for the ice shelf, then it carries redundant beacons and a certified glacier medic.","If an expedition lacks redundant beacons or lacks a certified glacier medic, then it is not cleared for the ice shelf."],"explanation":"\"The only\" + compound. The side-flipping look-alike, now carrying two conditions at once.","category":"Compound condition: the only"},{"order":62,"prompt":"A confirmed match in the pollen record guarantees a spring dating for the flood layer. The flood layer is dated to spring only if the stratum is sealed.","credited_answers":["If a match in the pollen record is confirmed, then the flood layer is dated to spring; and if the flood layer is dated to spring, then the stratum is sealed.","If the stratum is not sealed, then the flood layer is not dated to spring; and if the flood layer is not dated to spring, then a match in the pollen record is not confirmed."],"explanation":"\"Guarantees\" supplies the first rule; only if supplies the second. Confirmed pollen match leads to spring dating, which requires a sealed stratum. Contrapose the chain to work from an unsealed stratum back to no confirmed match. Do not infer no spring dating merely from no confirmed match.","category":"Two conditionals in one sentence"}]'::jsonb;
begin
  select md5(items::text) into current_hash from public.activities
    where id = '7946f46b-e7f8-4c60-b405-4ece9c409deb' for update;
  if current_hash is null then return; end if;
  if current_hash <> '3b29bb4b411b771f9c91ab357b11646a'
    and not exists (select 1 from public.activities where id = '7946f46b-e7f8-4c60-b405-4ece9c409deb'
      and items @> corrections) then
    raise exception 'Conditional definition changed; review before applying corrections';
  end if;
  update public.activities set
    items = (select jsonb_agg(coalesce(replacement.item, original.item) order by original.n)
      from jsonb_array_elements(items) with ordinality original(item,n)
      left join jsonb_array_elements(corrections) replacement(item)
      on replacement.item->>'order' = original.item->>'order'),
    subtitle = 'Diagram it on paper, then choose the matching diagram',
    instructions = jsonb_set(jsonb_set(instructions, '{task}', to_jsonb('Diagram the statement on paper first. Then choose the one diagram that expresses the complete statement. Your contrapositive is equivalent even when it looks different from the credited diagram.'::text)),
      '{answer_placeholder}', to_jsonb('Choose the diagram that matches your paper'::text)),
    updated_at = now()
  where id = '7946f46b-e7f8-4c60-b405-4ece9c409deb';
end;
$correction$;
