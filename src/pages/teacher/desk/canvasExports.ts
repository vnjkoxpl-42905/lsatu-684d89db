import DOMPurify from 'dompurify';

const DEFAULT_TITLE = 'Collaborative Workspace';

function safeFilename(title: string, extension: string) {
  const base = (title || DEFAULT_TITLE)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return `${base || 'canvas'}.${extension}`;
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push('<p class="canvas-spacer"></p>');
      continue;
    }

    const escaped = DOMPurify.sanitize(line);
    if (line.startsWith('# ')) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h1>${DOMPurify.sanitize(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h2>${DOMPurify.sanitize(line.slice(3))}</h2>`);
    } else if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${DOMPurify.sanitize(line.slice(2))}</li>`);
    } else {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<p>${escaped}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  return html.join('');
}

export function downloadCanvasMarkdown(title: string, markdown: string) {
  triggerDownload(
    safeFilename(title, 'md'),
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
  );
}

export async function copyCanvasMarkdown(markdown: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(markdown);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = markdown;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export async function downloadCanvasPdf(title: string, markdown: string) {
  const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const html2canvas = html2canvasMod.default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '780px';
  container.style.padding = '42px';
  container.style.background = '#ffffff';
  container.style.color = '#151515';
  container.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  container.style.fontSize = '15px';
  container.style.lineHeight = '1.6';
  container.innerHTML = `
    <style>
      h1 { margin: 0 0 18px; font-size: 30px; font-weight: 650; letter-spacing: 0; }
      h2 { margin: 28px 0 12px; font-size: 22px; font-weight: 620; letter-spacing: 0; }
      p { margin: 0 0 12px; }
      .canvas-spacer { height: 8px; margin: 0; }
      ul { margin: 0 0 16px 22px; padding: 0; }
      li { margin: 0 0 8px; }
    </style>
    ${markdownToHtml(markdown)}
  `;

  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    const image = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(safeFilename(title, 'pdf'));
  } finally {
    container.remove();
  }
}
