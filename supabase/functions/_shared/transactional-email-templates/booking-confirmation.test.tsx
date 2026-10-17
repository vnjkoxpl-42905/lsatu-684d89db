import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { BookingConfirmationEmail } from "./booking-confirmation.tsx";

function assertIncludes(value: string, expected: string) {
  if (!value.includes(expected)) {
    throw new Error(`Expected rendered email to include: ${expected}`);
  }
}

function assertExcludes(value: string, unexpected: string) {
  if (value.includes(unexpected)) {
    throw new Error(`Expected rendered email not to include: ${unexpected}`);
  }
}

const studentProps = {
  studentName: "Alex </script><script>alert(1)</script>",
  studentEmail: "alex@example.com",
  eventLabel: "LSAT Session",
  whenText: "Saturday, July 19 at 10:00 AM EDT",
  durationMinutes: 70,
  timezone: "America/Toronto",
  startAt: "2026-07-19T14:00:00.000Z",
  endAt: "2026-07-19T15:10:00.000Z",
  bookingId: "86bce548-f59a-4f12-a9d6-ecfb0f86105e",
  calendarUrl: "https://calendar.google.com/calendar/event?eid=example",
  meetUrl: "https://meet.google.com/abc-defg-hij",
};

Deno.test("booking confirmation renders the LSAT U student design and a secure calendar action", async () => {
  const html = await renderAsync(
    <BookingConfirmationEmail {...studentProps} />,
  );

  for (
    const expected of [
      "LSAT",
      "#75152A",
      "Your LSAT U session has been scheduled.",
      "Event type",
      "Invitee Email",
      "Saturday, July 19 at 10:00 AM EDT",
      "70",
      "minutes",
      "America/Toronto",
      "Your Google Calendar invitation has been sent.",
      "Join with Google Meet",
      "application/ld+json",
      "EmailMessage",
      "ViewAction",
      "Open Invitation",
      "https://calendar.google.com/calendar/event?eid=example",
    ]
  ) assertIncludes(html, expected);

  for (
    const unexpected of [
      "EventReservation",
      "http://schema.org/Confirmed",
      "on its way",
      "#7C5A2A",
      "#A98B5B",
      "#2563EB",
    ]
  ) {
    assertExcludes(html, unexpected);
  }
});

Deno.test("booking confirmation omits actions for insecure calendar URLs", async () => {
  const html = await renderAsync(
    <BookingConfirmationEmail
      {...studentProps}
      calendarUrl="http://calendar.google.com/calendar/event?eid=example"
    />,
  );

  assertExcludes(html, "application/ld+json");
  assertExcludes(html, "ViewAction");
});

Deno.test("booking confirmation escapes user-controlled action metadata", async () => {
  const html = await renderAsync(
    <BookingConfirmationEmail
      {...studentProps}
      eventLabel={'LSAT </script><script>alert("unsafe")</script>'}
    />,
  );

  assertIncludes(html, "EmailMessage");
  assertIncludes(html, "\\u003c/script>");
  assertExcludes(html, '</script><script>alert("unsafe")</script>');
});

Deno.test("booking confirmation keeps admin-only notes and files out of student mail", async () => {
  const student = await renderAsync(
    <BookingConfirmationEmail
      {...studentProps}
      studentNote="Timing notes"
      fileNames={["section.pdf"]}
    />,
  );
  assertExcludes(student, "Timing notes");
  assertExcludes(student, "section.pdf");

  const admin = await renderAsync(
    <BookingConfirmationEmail
      {...studentProps}
      recipientRole="admin"
      studentNote="Timing notes"
      fileNames={["section.pdf"]}
    />,
  );
  assertIncludes(admin, "Timing notes");
  assertIncludes(admin, "section.pdf");
  assertExcludes(admin, "application/ld+json");
});
