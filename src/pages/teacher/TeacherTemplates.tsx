import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Mail, MessageSquareText, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createMessageTemplate,
  deleteMessageTemplate,
  extractTemplatePlaceholders,
  KNOWN_TEMPLATE_PLACEHOLDERS,
  listMessageTemplates,
  type MessageTemplate,
  type MessageTemplateType,
  updateMessageTemplate,
} from '@/lib/messageTemplates';
import { cn } from '@/lib/utils';

const EMPTY_FORM = {
  title: '',
  template_type: 'general' as MessageTemplateType,
  subject: '',
  body: '',
};

function typeIcon(type: MessageTemplateType) {
  if (type === 'email') return Mail;
  if (type === 'message') return MessageSquareText;
  return FileText;
}

export default function TeacherTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<'all' | MessageTemplateType>('all');

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const visibleTemplates = useMemo(() => {
    return filter === 'all'
      ? templates
      : templates.filter((template) => template.template_type === filter);
  }, [filter, templates]);

  const placeholders = useMemo(
    () => extractTemplatePlaceholders(`${form.subject}\n${form.body}`),
    [form.subject, form.body],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMessageTemplates()
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message ?? 'Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const selectTemplate = (template: MessageTemplate) => {
    setSelectedId(template.id);
    setForm({
      title: template.title,
      template_type: template.template_type,
      subject: template.subject ?? '',
      body: template.body,
    });
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    try {
      const saved = selected
        ? await updateMessageTemplate(selected.id, form)
        : await createMessageTemplate(user.id, form);
      setTemplates((prev) => {
        const without = prev.filter((template) => template.id !== saved.id);
        return [saved, ...without];
      });
      setSelectedId(saved.id);
      toast.success(selected ? 'Template updated' : 'Template saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save template');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteMessageTemplate(selected.id);
      setTemplates((prev) => prev.filter((template) => template.id !== selected.id));
      startNew();
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete template');
    } finally {
      setDeleting(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setForm((prev) => ({
      ...prev,
      body: prev.body ? `${prev.body}${placeholder}` : placeholder,
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <div className="shrink-0 border-b border-zinc-800/60 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5">
              <FileText className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Templates</div>
              <div className="text-[11px] text-zinc-500">
                Reusable message and email drafts
              </div>
            </div>
          </div>
          <Button size="sm" onClick={startNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New template
          </Button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[320px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-zinc-800/60 bg-zinc-950/60">
          <div className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/95 p-3">
            <div className="flex gap-1">
              {(['all', 'general', 'message', 'email'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] capitalize transition-colors',
                    filter === type
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'border-zinc-800 text-zinc-400 hover:text-zinc-100',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates
            </div>
          ) : visibleTemplates.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              No templates yet.
            </div>
          ) : (
            <div className="p-2">
              {visibleTemplates.map((template) => {
                const Icon = typeIcon(template.template_type);
                const active = template.id === selectedId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className={cn(
                      'mb-1 flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                      active
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-transparent hover:border-zinc-800 hover:bg-zinc-900/70',
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{template.title}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {template.subject || template.body}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
                  Title
                </label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Lesson follow-up"
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
                  Type
                </label>
                <select
                  value={form.template_type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      template_type: event.target.value as MessageTemplateType,
                      subject: event.target.value === 'email' ? prev.subject : '',
                    }))
                  }
                  className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                >
                  <option value="general">General</option>
                  <option value="message">Message</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {form.template_type === 'email' && (
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
                  Subject
                </label>
                <Input
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Next steps for {{first_name}}"
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">
                Body
              </label>
              <Textarea
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Hi {{first_name}}, ..."
                rows={14}
                className="min-h-[320px] resize-y border-zinc-800 bg-zinc-900 text-sm leading-relaxed text-zinc-100"
              />
            </div>

            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">
                Placeholders
              </div>
              <div className="flex flex-wrap gap-1.5">
                {KNOWN_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder)}
                    className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
              {placeholders.length > 0 && (
                <div className="mt-3 text-xs text-zinc-500">
                  Detected: {placeholders.join(', ')}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={save} disabled={saving || deleting} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {selected ? 'Save changes' : 'Save template'}
              </Button>
              {selected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={remove}
                  disabled={saving || deleting}
                  className="gap-1.5 border-red-500/30 text-red-300 hover:bg-red-500/10"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
