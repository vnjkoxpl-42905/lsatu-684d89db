import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GmailAttachmentCard } from "./GmailAttachmentCard";

const { mockGetAttachment } = vi.hoisted(() => ({
  mockGetAttachment: vi.fn(),
}));

vi.mock("../api", () => ({
  getAttachment: (messageId: string, attachmentId: string) => mockGetAttachment(messageId, attachmentId),
}));

describe("GmailAttachmentCard", () => {
  beforeEach(() => {
    mockGetAttachment.mockResolvedValue({ dataBase64: "aGVsbG8=", size: 5 });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:https://example.test/gmail-image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "open", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders Gmail image attachments as clickable image previews", async () => {
    render(
      <GmailAttachmentCard
        messageId="message-1"
        attachment={{
          partId: "1",
          filename: "student-screenshot.png",
          mimeType: "image/png",
          size: 42_000,
          attachmentId: "attachment-1",
        }}
      />,
    );

    expect(await screen.findByAltText("student-screenshot.png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /student-screenshot\.png/i }));

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        "blob:https://example.test/gmail-image",
        "_blank",
        "noopener,noreferrer",
      );
    });
    expect(mockGetAttachment).toHaveBeenCalledWith("message-1", "attachment-1");
  });
});
