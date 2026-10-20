import { supabase } from '@/integrations/supabase/client';

export type MessageTemplateType = 'email' | 'message' | 'general';

export interface MessageTemplate {
  id: string;
  owner_id: string;
  title: string;
  template_type: MessageTemplateType;
  subject: string | null;
  body: string;
  placeholders: string[];
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateInput {
  title: string;
  template_type: MessageTemplateType;
  subject?: string | null;
  body: string;
}

const PLACEHOLDER_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export const KNOWN_TEMPLATE_PLACEHOLDERS = [
  '{{student_name}}',
  '{{first_name}}',
  '{{lesson_name}}',
  '{{assignment_name}}',
  '{{deadline}}',
  '{{cal_link}}',
];

export function extractTemplatePlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    found.add(`{{${match[1]}}}`);
  }
  return Array.from(found);
}

function fromRow(row: {
  id: string;
  owner_id: string;
  title: string;
  template_type: string;
  subject: string | null;
  body: string;
  placeholders: unknown;
  created_at: string;
  updated_at: string;
}): MessageTemplate {
  return {
    ...row,
    template_type: row.template_type as MessageTemplateType,
    placeholders: Array.isArray(row.placeholders)
      ? row.placeholders.filter((p): p is string => typeof p === 'string')
      : [],
  };
}

function normalizeInput(input: MessageTemplateInput) {
  const subject = input.template_type === 'email' ? input.subject?.trim() || null : null;
  const body = input.body.trim();
  return {
    title: input.title.trim(),
    template_type: input.template_type,
    subject,
    body,
    placeholders: extractTemplatePlaceholders(`${subject ?? ''}\n${body}`),
  };
}

export async function listMessageTemplates(type?: MessageTemplateType): Promise<MessageTemplate[]> {
  const client = supabase as any;
  let query = client
    .from('teacher_message_templates')
    .select('*')
    .order('updated_at', { ascending: false });

  if (type) {
    query = query.in('template_type', ['general', type]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as any[]).map(fromRow);
}

export async function createMessageTemplate(
  ownerId: string,
  input: MessageTemplateInput,
): Promise<MessageTemplate> {
  const client = supabase as any;
  const { data, error } = await client
    .from('teacher_message_templates')
    .insert({ ...normalizeInput(input), owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as any);
}

export async function updateMessageTemplate(
  id: string,
  input: MessageTemplateInput,
): Promise<MessageTemplate> {
  const client = supabase as any;
  const { data, error } = await client
    .from('teacher_message_templates')
    .update(normalizeInput(input))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as any);
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  const client = supabase as any;
  const { error } = await client
    .from('teacher_message_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export function filterMessageTemplates(
  templates: MessageTemplate[],
  query: string,
): MessageTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter((template) => {
    return (
      template.title.toLowerCase().includes(q) ||
      template.body.toLowerCase().includes(q) ||
      template.subject?.toLowerCase().includes(q)
    );
  });
}

export function slashTemplateQuery(value: string): string | null {
  if (!value.startsWith('/')) return null;
  const firstToken = value.slice(1).split(/\s/)[0] ?? '';
  if (value.slice(1).includes(' ')) return null;
  return firstToken;
}

export function replaceSlashCommand(value: string, replacement: string): string {
  if (slashTemplateQuery(value) !== null) return replacement;
  return value.trim() ? `${value}\n\n${replacement}` : replacement;
}
