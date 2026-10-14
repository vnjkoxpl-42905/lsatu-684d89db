// A small, deliberate RFC 5322 / MIME builder for one message shape.
//
// nodemailer is not a dependency here and adding a runtime package to a
// Lovable-synced repo to assemble one local file is a poor trade. The risk of
// hand-rolled MIME is real, so it is answered with verification rather than
// confidence: scripts/build-drill-email.test.mjs parses the output back with
// Python's stdlib email module — an independent implementation — and byte
// compares every extracted attachment against its source.
//
// Two decisions that remove whole classes of bug:
//   - base64 for EVERY part, bodies included. Quoted-printable has to get soft
//     line breaks, trailing whitespace and '=' escaping right; base64 has to
//     get line length right. Only one of those is worth hand-writing.
//   - CRLF everywhere, enforced at the end. A bare LF is the classic reason an
//     attachment arrives as garbage in one client and fine in another.

import crypto from 'node:crypto';

const CRLF = '\r\n';

/** base64, wrapped at 76 columns as required for a transfer encoding. */
function b64(buf) {
  const s = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf, 'utf8').toString('base64');
  return (s.match(/.{1,76}/g) ?? []).join(CRLF);
}

/** RFC 2047 encoding, so a subject with an em dash or an accent survives. */
function encodeHeader(value) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function boundary(tag) {
  return `----lsatu_${tag}_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * @param {object} m
 * @param {string} m.to
 * @param {string} m.subject
 * @param {string} m.text
 * @param {string} m.html
 * @param {Array<{filename:string, contentType:string, content:Buffer}>} m.attachments
 * @param {Date} m.date
 *
 * No From header on purpose: Gmail stamps the authenticated account onto a
 * draft, and a From that disagrees with the sending account is a silent
 * deliverability problem rather than a visible error.
 */
export function buildMimeMessage({ to, subject, text, html, attachments = [], date }) {
  const mixed = boundary('mixed');
  const alt = boundary('alt');

  const lines = [];
  const push = (s) => lines.push(s);

  push(`Date: ${(date ?? new Date()).toUTCString().replace(/GMT$/, '+0000')}`);
  push(`To: ${encodeHeader(to)}`);
  push(`Subject: ${encodeHeader(subject)}`);
  push('MIME-Version: 1.0');
  push(`Content-Type: multipart/mixed; boundary="${mixed}"`);
  push('');

  // --- the readable message, plain and html ---
  push(`--${mixed}`);
  push(`Content-Type: multipart/alternative; boundary="${alt}"`);
  push('');

  push(`--${alt}`);
  push('Content-Type: text/plain; charset=utf-8');
  push('Content-Transfer-Encoding: base64');
  push('');
  push(b64(text));
  push('');

  push(`--${alt}`);
  push('Content-Type: text/html; charset=utf-8');
  push('Content-Transfer-Encoding: base64');
  push('');
  push(b64(html));
  push('');

  push(`--${alt}--`);
  push('');

  // --- the attachments ---
  for (const a of attachments) {
    push(`--${mixed}`);
    // A real type rather than application/octet-stream, so Gmail offers a
    // preview instead of a bare download.
    push(`Content-Type: ${a.contentType}; name="${a.filename}"`);
    push('Content-Transfer-Encoding: base64');
    push(`Content-Disposition: attachment; filename="${a.filename}"`);
    push('');
    push(b64(a.content));
    push('');
  }

  push(`--${mixed}--`);
  push('');

  const raw = lines.join(CRLF);
  // Belt and braces: normalise any stray lone LF introduced by a body string.
  return raw.replace(/\r?\n/g, CRLF);
}
