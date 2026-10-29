// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { importText } from "./importText";

const file = (name: string, body: string, size = body.length) => ({ name, size, text: async () => body });
describe("document import", () => {
  it("reads supported text and preserves Markdown", async () => {
    expect(await importText(file("practice.txt", "  One two.  "))).toEqual({ title: "practice", body: "One two." });
    expect((await importText(file("notes.md", "# Heading\n\nText"))).body).toBe("# Heading\n\nText");
  });
  it("extracts HTML with block separation and excludes script/style content", async () => {
    const source = "<style>hidden</style><p>One <b>two</b>.</p><div>Three<br>four.</div><script>unwanted()</script>";
    expect((await importText(file("article.html", source))).body).toBe("One two. Three four.");
  });
  it("explains unsupported, oversized, binary, empty, and unreadable files", async () => {
    await expect(importText(file("doc.pdf", "binary"))).rejects.toThrow("Choose a text");
    await expect(importText(file("huge.txt", "abc", 6 * 1024 * 1024))).rejects.toThrow("too large");
    await expect(importText(file("binary.txt", "abc\0def"))).rejects.toThrow("binary data");
    await expect(importText(file("empty.htm", "<script>not text</script>"))).rejects.toThrow("no readable text");
    await expect(importText({ name: "locked.txt", size: 1, text: async () => { throw new Error("blocked"); } })).rejects.toThrow("could not be read");
  });
});
