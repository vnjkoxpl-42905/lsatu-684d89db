const MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_ACCEPT = ".txt,.md,.text,.html,.htm,text/plain,text/markdown,text/html";

export async function importText(file: Pick<File, "name" | "size" | "text">): Promise<{ title: string; body: string }> {
  if (!/\.(txt|md|text|html?)$/i.test(file.name)) throw new Error("Choose a text, Markdown, or HTML file (.txt, .md, .text, .html, or .htm).");
  if (file.size > MAX_BYTES) throw new Error("This file is too large. Choose a file under 5 MB.");
  let source: string;
  try { source = await file.text(); }
  catch { throw new Error("This file could not be read. Choose it again or try another file."); }
  if (source.includes("\0")) throw new Error("This file contains binary data. Choose a text, Markdown, or HTML file.");
  let body = source.trim();
  if (/\.html?$/i.test(file.name)) {
    const document = new DOMParser().parseFromString(source, "text/html");
    document.querySelectorAll("script,style,noscript,template").forEach((node) => node.remove());
    document.body.querySelectorAll("br,p,div,section,article,li,h1,h2,h3,h4,h5,h6,tr,td,th").forEach((node) => {
      node.prepend(document.createTextNode(" "));
      node.append(document.createTextNode(" "));
    });
    body = (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  if (!body) throw new Error("This file has no readable text. Choose another file or paste your text.");
  return { title: file.name.replace(/\.[^.]+$/, ""), body };
}
