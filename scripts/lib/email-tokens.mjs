// The visual tokens for outbound LSAT U email.
//
// Deliberately duplicated from
// supabase/functions/_shared/transactional-email-templates/ rather than
// imported: those templates are Deno + React Email and cannot be loaded from
// local Node. Two copies with a comment pointing at each other beat a shared
// package for two files. If you change a value here, change it there.
//
// Everything is inlined at the element level. Gmail strips <style> blocks
// unpredictably, which is why the React Email templates inline everything too.

export const T = {
  bg: '#ffffff',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  cardBg: '#FAF7F2',
  cardBorder: '#E8DCC8',
  accent: '#7C5A2A',
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  width: 560,
};

export const styles = {
  wrap: `margin:0;padding:24px 12px;background:${T.bg};`,
  container: `max-width:${T.width}px;margin:0 auto;font-family:${T.font};color:${T.body};font-size:16px;line-height:1.6;`,
  greeting: `margin:0 0 16px;font-size:16px;color:${T.ink};`,
  para: `margin:0 0 16px;font-size:16px;line-height:1.6;color:${T.body};`,
  card: `margin:24px 0;padding:20px 22px;background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:12px;`,
  cardTitle: `margin:0 0 6px;font-family:${T.serif};font-size:20px;line-height:1.25;color:${T.accent};`,
  cardMeta: `margin:0;font-size:13px;color:${T.muted};`,
  kicker: `margin:28px 0 12px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:${T.muted};`,
  listRow: `padding:7px 0;border-bottom:1px solid #EEF2F6;font-size:14px;`,
  listNum: `display:inline-block;width:22px;color:${T.accent};font-weight:700;`,
  listRef: `color:${T.ink};font-weight:600;`,
  listType: `color:${T.muted};`,
  prompt: `margin:24px 0 0;padding:16px 18px;background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:12px;font-size:15px;line-height:1.6;color:${T.body};`,
  link: `color:${T.accent};font-weight:600;`,
  footer: `margin:28px 0 0;font-size:15px;color:${T.body};`,
};
