// Render a self-contained HTML string to a real, text-bearing PDF.
//
// The repo's existing PDF path (src/lib/taPdf.ts) screenshots the DOM with
// html2canvas and packs the images into jsPDF. That is right for a report
// nobody reads closely and wrong here: a rasterised LSAT question cannot be
// searched, selected, or read by a screen reader, and it triples the file size
// of something that has to survive an email attachment limit.
//
// Headless Chromium prints the same file the student would open, using the
// @media print rules that live inside its own inline <style>.

import { chromium } from '@playwright/test';

export async function renderPdf(html, outPath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // setContent rather than a file:// navigation: the artifact is a single
    // self-contained string with no relative assets to resolve.
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.6in', bottom: '0.7in', left: '0.6in', right: '0.6in' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#888;padding:0 0.6in;display:flex;justify-content:space-between;">' +
        '<span>LSAT U</span><span class="pageNumber"></span></div>',
    });
  } finally {
    await browser.close();
  }
}
