import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const src = path.resolve(process.cwd(), 'src');
const inventory = ['components/ta/DraftCard.tsx', 'components/teacher/AssignmentBuilder.tsx', 'components/teacher/RecapComposer.tsx', 'components/teacher/schedule/StudentSchedulePanel.tsx', 'hooks/useWeeklyPlanPublisher.ts', 'lib/accessTierClient.ts', 'lib/agentActions.ts', 'lib/aiTAQueue.ts', 'lib/assignWork.ts', 'lib/classroomItems.ts', 'lib/teacherAssignResource.ts', 'lib/publishSessionBundle.ts', 'pages/teacher/TeacherBootcamps.tsx'].sort();
const tables = new Set(['classroom_items', 'homework_assignments', 'guided_drill_assignments', 'activity_assignments', 'ta_assignments', 'practice_test_assignments']);
function files(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path.join(dir, entry.name)] : []); }
describe('assignment writer coverage', () => {
  it('inventories each native insert and shared Classroom writer, and requires an explicit persisted policy on native payloads', () => {
    const found = new Set<string>(); const missing: string[] = [];
    for (const file of files(src)) {
      const text = readFileSync(file, 'utf8');
      if (!/materialize_session_bundle_part|createClassroomItem|from\(['"](?:classroom_items|homework_assignments|guided_drill_assignments|activity_assignments|ta_assignments|practice_test_assignments)['"]/.test(text)) continue;
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const relative = path.relative(src, file).replace(/\\/g, '/');
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          if (node.expression.getText(source) === 'createClassroomItem' || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'rpc' && node.arguments[0]?.getText(source).includes('materialize_session_bundle_part'))) found.add(relative);
          if (ts.isPropertyAccessExpression(node.expression) && ['insert', 'upsert'].includes(node.expression.name.text)) {
            const chain = node.expression.expression.getText(source); const table = chain.match(/\.from\(['"]([^'"]+)['"]/ )?.[1];
            if (table && tables.has(table)) {
              found.add(relative); const payload = node.arguments[0]?.getText(source) ?? '';
              if (!/notification_policy|assignmentDeliveryColumns/.test(payload)) missing.push(relative + ':' + table);
            }
          }
        }
        ts.forEachChild(node, visit);
      }; visit(source);
    }
    expect([...found].sort()).toEqual(inventory); expect(missing).toEqual([]);
  });
});
