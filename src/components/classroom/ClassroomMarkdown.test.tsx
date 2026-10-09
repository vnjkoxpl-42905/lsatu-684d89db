import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClassroomMarkdown from "./ClassroomMarkdown";

/**
 * The bug these lock down: `content_markdown` was rendered as
 * `<p>{item.content_markdown}</p>`, so every recap reached the student as one
 * run-on line carrying its own syntax.
 */
describe("a recap body written in markdown", () => {
  it("renders paragraphs as separate blocks rather than one run-on line", () => {
    const { container } = render(
      <ClassroomMarkdown>{"First thing.\n\nSecond thing."}</ClassroomMarkdown>,
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("First thing.");
    expect(paragraphs[1].textContent).toBe("Second thing.");
  });

  it("renders a bullet list as a list, not as text starting with a dash", () => {
    const { container } = render(
      <ClassroomMarkdown>{"- Sufficient assumption\n- Negation"}</ClassroomMarkdown>,
    );
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("- Sufficient");
  });

  it("renders emphasis rather than printing the asterisks", () => {
    const { container } = render(
      <ClassroomMarkdown>{"**1. What is a sufficient assumption?**"}</ClassroomMarkdown>,
    );
    expect(container.querySelector("strong")?.textContent).toBe(
      "1. What is a sufficient assumption?",
    );
    expect(container.textContent).not.toContain("**");
  });

  it("demotes an authored h1 so it cannot open a second document", () => {
    // The page already renders the title as <h1 class="classroom-title">.
    const { container } = render(
      <ClassroomMarkdown>{"# What we covered"}</ClassroomMarkdown>,
    );
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("What we covered");
  });

  it("renders a task item as a box rather than the literal [ ]", () => {
    // partToMarkdown emits exactly this shape for a bundle's homework part.
    const { container } = render(
      <ClassroomMarkdown>{"- [ ] Redo PT 141 S2\n- [x] Blind review"}</ClassroomMarkdown>,
    );
    const tasks = container.querySelectorAll("li.classroom-prose-task");
    expect(tasks).toHaveLength(2);
    expect(container.textContent).not.toContain("[ ]");
    expect(container.textContent).not.toContain("[x]");
    expect(tasks[0].hasAttribute("data-done")).toBe(false);
    expect(tasks[1].hasAttribute("data-done")).toBe(true);
    expect(screen.getByText("Redo PT 141 S2")).toBeTruthy();
  });

  it("does not let raw HTML through; that path belongs to the sanitizer", () => {
    const { container } = render(
      <ClassroomMarkdown>
        {"<style>body{display:none}</style>\n\nWhat we covered."}
      </ClassroomMarkdown>,
    );
    expect(container.querySelector("style")).toBeNull();
    expect(container.textContent).not.toContain("display:none");
    expect(container.textContent).toContain("What we covered.");
  });

  it("sends an external link to a new tab and leaves an in-app path alone", () => {
    const { container } = render(
      <ClassroomMarkdown>
        {"[7Sage](https://7sage.com) and [your drills](/classroom/drill)"}
      </ClassroomMarkdown>,
    );
    const [external, internal] = [...container.querySelectorAll("a")];
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toContain("noopener");
    expect(internal.getAttribute("target")).toBeNull();
  });

  it("renders nothing for an empty or whitespace-only body", () => {
    const { container } = render(<ClassroomMarkdown>{"   \n  "}</ClassroomMarkdown>);
    expect(container.firstChild).toBeNull();
  });
});
