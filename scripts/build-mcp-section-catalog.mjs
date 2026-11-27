import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { join, resolve } from "node:path";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const letters = ["A", "B", "C", "D", "E"];
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

function requireBank(condition, message) {
  if (!condition) throw new Error(message);
}

function logicalReasoningSections(dataDir) {
  // These are the same source files used by build-question-bank.mjs and the LR
  // runner. Section type comes from the bank, never from its ordinal.
  return readdirSync(dataDir).flatMap((file) => {
    const match = /^PT(\d+)-S(\d+)-LR\.json$/.exec(file);
    if (!match) return [];
    const prepTest = Number(match[1]);
    const section = Number(match[2]);
    const rows = readJson(join(dataDir, file));
    requireBank(Array.isArray(rows), file + ": expected an array");
    const seen = new Set();
    for (const row of rows) {
      requireBank(
        row.practiceTest === "PT" + prepTest && row.sectionNumber === section &&
          positiveInteger(row.questionNumber) && !seen.has(row.questionNumber),
        file + ": bad section identity or duplicate question position",
      );
      seen.add(row.questionNumber);
      if (row.status === "removed") continue;
      requireBank(
        hasText(row.questionStem) && letters.includes(row.correctAnswer) &&
          letters.every((letter) => hasText(row.answerChoices?.[letter])),
        file + ": unanswerable question " + row.questionNumber,
      );
    }
    // A complete roster can include an explicitly removed position. A gap
    // with no source record is different: skip partial imports.
    if (seen.size < 24 || seen.size !== Math.max(...seen)) return [];
    const questionIds = rows.filter((row) => row.status !== "removed")
      .sort((a, b) => a.questionNumber - b.questionNumber)
      .map((row) => "PT" + prepTest + "-S" + section + "-Q" + row.questionNumber);
    if (questionIds.length < 23) return [];
    return [{ prep_test: prepTest, section_number: section, section_type: "LR", question_ids: questionIds }];
  });
}

function readingComprehensionSections(dataDir) {
  const rcDir = join(dataDir, "rc");
  const index = readJson(join(rcDir, "rc-index.json"));
  return index.preptests.flatMap(({ preptest, passages }) => {
    const source = readJson(join(rcDir, "RC-PT" + preptest + ".json"));
    requireBank(source.preptest === preptest, "RC source PrepTest identity mismatch");
    const actualByPassage = new Map(source.passages.map((passage) => [passage.passageId, passage]));
    const bySection = new Map();
    for (const indexed of passages) {
      const actual = actualByPassage.get(indexed.passageId);
      requireBank(
        actual?.section === indexed.section && actual.setNumber === indexed.setNumber,
        "RC index and source disagree for passage " + indexed.passageId,
      );
      const questions = [...actual.questions].sort((a, b) => a.position - b.position);
      const ids = questions.map((question) => question.questionId);
      requireBank(
        ids.length === indexed.questionCount && JSON.stringify(ids) === JSON.stringify(indexed.questionIds),
        "RC question roster mismatch for passage " + actual.passageId,
      );
      requireBank(
        questions.every((question) =>
          positiveInteger(question.questionId) && positiveInteger(question.position) &&
          hasText(question.prompt) && letters.includes(question.correctAnswer) &&
          letters.every((letter) => question.choices?.some((choice) =>
            choice.letter === letter && hasText(choice.text)
          ))
        ),
        "RC source contains an unanswerable question for passage " + actual.passageId,
      );
      const group = bySection.get(actual.section) ?? [];
      group.push({ passageId: actual.passageId, position: actual.setNumber, questions });
      bySection.set(actual.section, group);
    }
    return [...bySection].flatMap(([section, group]) => {
      const ordered = group.sort((a, b) => a.position - b.position);
      if (ordered.length !== 4 || ordered.some((passage, i) => passage.position !== i + 1 || !passage.questions.length)) return [];
      const questions = ordered.flatMap((passage) => passage.questions);
      // An index built from incomplete source can agree with the file and
      // still skip a numbered position. Exclude these partial imports.
      if (questions.length < 26 || questions.some((question, i) => question.position !== i + 1)) return [];
      const ids = questions.map((question) => question.questionId);
      requireBank(new Set(ids).size === ids.length, "Duplicate question ID in RC section");
      return [{
        prep_test: preptest,
        section_number: section,
        section_type: "RC",
        question_ids: ids.map(String),
        passage_ids: ordered.map((passage) => passage.passageId),
      }];
    });
  });
}

export function buildMcpSectionCatalog(dataDir) {
  const rows = [...logicalReasoningSections(dataDir), ...readingComprehensionSections(dataDir)]
    .sort((a, b) => a.prep_test - b.prep_test || a.section_number - b.section_number);
  requireBank(rows.length > 0, "No full sections found in the bank");
  requireBank(
    new Set(rows.map(({ prep_test, section_number }) => prep_test + ":" + section_number)).size === rows.length,
    "LR and RC bank files disagree on a section type",
  );
  return rows;
}

function buildLrCatalogMigration(catalog) {
  const values = catalog.filter((section) => section.section_type === "LR").map((section) => {
    const positions = section.question_ids.map((qid) => Number(qid.split("-Q")[1])).join(", ");
    return "  (" + section.prep_test + ", " + section.section_number + ", array[" + positions + "])";
  });
  return `-- Generated by scripts/build-mcp-section-catalog.mjs from the canonical app question bank.
begin;
create table public.mcp_lr_section_catalog (
  prep_test integer not null,
  section_number integer not null,
  question_qids text[] not null,
  primary key (prep_test, section_number)
);
alter table public.mcp_lr_section_catalog enable row level security;
revoke all on public.mcp_lr_section_catalog from public, anon, authenticated, service_role;
insert into public.mcp_lr_section_catalog (prep_test, section_number, question_qids)
select seed.prep_test, seed.section_number, array(
  select format('PT%s-S%s-Q%s', seed.prep_test, seed.section_number, q.position)
  from unnest(seed.positions) with ordinality as q(position, ordinal)
  order by q.ordinal
)
from (values
${values.join(",\n")}
) as seed(prep_test, section_number, positions);
commit;
`;
}

if (process.argv[1] && import.meta.url.startsWith("file:") && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const catalog = buildMcpSectionCatalog(resolve(root, "public/data"));
  const artifact = "[\n" + catalog.map((section) => "  " + JSON.stringify(section)).join(",\n") + "\n]\n";
  const outputs = [
    ["src/lib/mcp/sectionCatalog.generated.json", artifact],
    ["supabase/migrations/20261127205500_mcp_lr_section_catalog.sql", buildLrCatalogMigration(catalog)],
  ];
  for (const [relative, content] of outputs) {
    const output = resolve(root, relative);
    if (process.argv.includes("--check")) {
      requireBank(readFileSync(output, "utf8").replace(/\r\n/g, "\n") === content, relative + " is stale. Regenerate the MCP catalog.");
    } else {
      writeFileSync(output, content);
    }
  }
  console.log("MCP section catalog: " + catalog.length + " full sections");
}
