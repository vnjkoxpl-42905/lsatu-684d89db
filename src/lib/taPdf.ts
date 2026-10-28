import DOMPurify from "dompurify";

/**
 * Generate and trigger download of a PDF for a TA assignment.
 *
 * Client-side path: sanitizes `contentHtml`, renders it into an offscreen
 * container using the page's existing prose styles, rasterizes via
 * html2canvas, and packs into a multi-page A4 PDF via jsPDF.
 *
 * Both libs are lazy-imported so they only hit the bundle when a student
 * actually clicks Download.
 */
export async function downloadAssignmentPdf(params: {
  title: string;
  contentHtml: string;
}): Promise<void> {
  const { title, contentHtml } = params;

  const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasMod.default;

  const sanitized = DOMPurify.sanitize(contentHtml || "");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "780px";
  container.style.padding = "32px";
  container.style.background = "#ffffff";
  container.style.color = "#111111";
  container.style.fontFamily =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.fontSize = "14px";
  container.style.lineHeight = "1.55";

  const heading = document.createElement("h1");
  heading.textContent = title || "Assignment";
  heading.style.fontSize = "22px";
  heading.style.fontWeight = "600";
  heading.style.marginBottom = "16px";
  container.appendChild(heading);

  const body = document.createElement("div");
  body.innerHTML = sanitized;
  container.appendChild(body);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeTitle =
      (title || "assignment").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 64) ||
      "assignment";
    pdf.save(`${safeTitle}.pdf`);
  } finally {
    container.remove();
  }
}
