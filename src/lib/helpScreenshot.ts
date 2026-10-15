import html2canvas from 'html2canvas';

// Captures the current viewport as a PNG File suitable for the
// message-attachments storage bucket. Skips the Help sheet itself
// (data-help-overlay) so the screenshot reflects what the student sees
// behind the overlay.

export async function captureViewportPng(filename = 'screenshot.png'): Promise<File> {
  const canvas = await html2canvas(document.body, {
    backgroundColor: null,
    logging: false,
    useCORS: true,
    ignoreElements: (el) =>
      el instanceof HTMLElement && el.hasAttribute('data-help-overlay'),
    // Capture only the viewport, not the full scrollable document.
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
  });
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png',
      0.92,
    );
  });
  return new File([blob], filename, { type: 'image/png' });
}
