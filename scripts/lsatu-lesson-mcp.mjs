import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const vault = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const admin = path.join(vault, 'system', 'scripts', 'lsatu-admin.mjs');
const server = new McpServer({ name: 'lsat-u-lessons', version: '1.0.0' });

server.registerTool('publish_interactive_lesson', {
  title: 'Publish an interactive LSAT U lesson',
  description: 'Post a self-contained HTML lesson to one student. Verifies the new item and archives the prior same-title note. No browser is used.',
  inputSchema: {
    student: z.string().min(2).describe('Exact student email or unambiguous name.'),
    html_file: z.string().min(1).describe('Absolute path to a self-contained, marked HTML lesson inside the AI OS workspace.'),
    title: z.string().min(1).max(160),
    dry_run: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
}, async ({ student, html_file, title, dry_run }) => {
  const args = [admin, 'post-lesson', student, html_file, '--title', title];
  if (dry_run) args.push('--dry-run');
  try {
    const { stdout } = await run(process.execPath, args, {
      cwd: vault,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      timeout: 120000,
    });
    return { content: [{ type: 'text', text: stdout.trim() }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: String(error.stderr || error.message).trim() }] };
  }
});

server.registerTool('list_student_classroom_items', {
  title: 'List a student’s LSAT U Classroom items',
  description: 'Read the current Classroom items and IDs for one student.',
  inputSchema: { student: z.string().min(2) },
  annotations: { readOnlyHint: true },
}, async ({ student }) => {
  try {
    const { stdout } = await run(process.execPath, [admin, 'items', student], {
      cwd: vault,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      timeout: 120000,
    });
    return { content: [{ type: 'text', text: stdout.trim() }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: String(error.stderr || error.message).trim() }] };
  }
});

await server.connect(new StdioServerTransport());
