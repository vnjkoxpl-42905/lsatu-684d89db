#!/usr/bin/env node
/**
 * Extracts a human-readable transcript from a Claude Code session JSONL.
 *
 * Usage:
 *   node extract-readable.mjs full-session.jsonl > readable-transcript.md
 *
 * Output:
 *   - User messages (prefixed `## User`)
 *   - Assistant text content blocks (prefixed `## Claude`), tool-call blocks
 *     summarized as `[tool: <name>]` lines.
 *   - Tool results inlined only when stderr/error or short text.
 */

import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node extract-readable.mjs <session.jsonl>');
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
const out = [];
out.push(`# Claude Code session transcript`);
out.push('');
out.push(`Source: \`${path.basename(file)}\``);
out.push(`Lines: ${lines.length}`);
out.push('');
out.push('---');
out.push('');

let lastRole = null;
let turn = 0;

for (const line of lines) {
  let rec;
  try { rec = JSON.parse(line); } catch { continue; }
  const m = rec.message ?? rec;
  const role = m.role ?? rec.type;

  // Filter to assistant + user messages.
  if (role === 'user') {
    turn += 1;
    out.push(`## User · turn ${turn}`);
    out.push('');
    if (typeof m.content === 'string') {
      out.push(stripSysReminders(m.content));
    } else if (Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type === 'text') {
          out.push(stripSysReminders(c.text));
        } else if (c.type === 'tool_result') {
          // Skip tool results in user content (they belong to the prior assistant turn).
          continue;
        }
      }
    }
    out.push('');
    lastRole = 'user';
    continue;
  }

  if (role === 'assistant') {
    if (lastRole !== 'assistant') {
      out.push(`## Claude · turn ${turn}`);
      out.push('');
    }
    if (Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type === 'text' && c.text) {
          out.push(stripSysReminders(c.text));
          out.push('');
        } else if (c.type === 'tool_use') {
          const args = previewArgs(c.input);
          out.push(`> [tool: ${c.name}] ${args}`);
          out.push('');
        }
      }
    }
    lastRole = 'assistant';
  }
}

console.log(out.join('\n'));

function stripSysReminders(s) {
  if (!s) return '';
  // Strip <system-reminder>...</system-reminder> blocks.
  let stripped = s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  // Strip local-command-caveat blocks.
  stripped = stripped.replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '').trim();
  return stripped;
}

function previewArgs(input) {
  if (!input || typeof input !== 'object') return '';
  // Show interesting fields, truncated.
  const interesting = ['command', 'file_path', 'description', 'old_string', 'new_string', 'pattern', 'query', 'prompt'];
  const parts = [];
  for (const k of interesting) {
    if (k in input) {
      let v = String(input[k]);
      if (v.length > 80) v = v.slice(0, 77) + '...';
      v = v.replace(/\n/g, ' ');
      parts.push(`${k}=${JSON.stringify(v)}`);
      if (parts.length >= 2) break;
    }
  }
  return parts.join(' ');
}
