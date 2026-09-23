import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

const SITE_NAME = "LSAT U";
const BURGUNDY = "#75152A";

export interface BookingConfirmationProps {
  // "student" = the confirmation the student receives; "admin" = the copy Joshua receives
  recipientRole?: "student" | "admin";
  studentName?: string;
  studentEmail?: string;
  eventLabel?: string;
  whenText?: string;
  durationMinutes?: number;
  timezone?: string;
  calendarUrl?: string;
  meetUrl?: string;
  studentNote?: string;
  fileNames?: string[];
  cancelUrl?: string;
  calendarPending?: boolean;
}

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

function secureHttpsUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function emailMessageMarkup({
  calendarUrl,
  eventLabel,
}: BookingConfirmationProps): string | null {
  const actionUrl = secureHttpsUrl(calendarUrl);
  if (!actionUrl) return null;

  const message = {
    "@context": "http://schema.org",
    "@type": "EmailMessage",
    description: `Open your calendar invitation for ${
      eventLabel || "LSAT U Session"
    }.`,
    potentialAction: {
      "@type": "ViewAction",
      target: actionUrl,
      url: actionUrl,
      name: "Open Invitation",
    },
  };

  // Prevent user-provided text from closing the script element in HTML email.
  return JSON.stringify(message).replace(/</g, "\\u003c");
}

interface DetailProps {
  label: string;
  children: React.ReactNode;
}

function Detail({ label, children }: DetailProps): React.ReactElement {
  return (
    <Section style={detailRow}>
      <Text style={detailLabel}>{label}</Text>
      <Text style={detailValue}>{children}</Text>
    </Section>
  );
}

export function BookingConfirmationEmail({
  recipientRole = "student",
  studentName,
  studentEmail,
  eventLabel = "LSAT Session",
  whenText = "Your upcoming session",
  durationMinutes = 60,
  timezone = "America/Toronto",
  calendarUrl,
  meetUrl,
  studentNote = "",
  fileNames = [],
  cancelUrl,
  calendarPending,
}: BookingConfirmationProps): React.ReactElement {
  const isAdmin = recipientRole === "admin";
  const hasSubmission = isAdmin &&
    (Boolean(studentNote) || fileNames.length > 0);
  const structuredData = isAdmin ? null : emailMessageMarkup({
    calendarUrl,
    eventLabel,
  });

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isAdmin
          ? `${studentName ?? "A student"} booked ${eventLabel} - ${whenText}`
          : `Your ${eventLabel} with Joshua is scheduled - ${whenText}`}
      </Preview>
      <Body style={main}>
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredData }}
          />
        )}
        <Container style={container}>
          <Section style={wordmarkSection}>
            <Text style={wordmark}>LSAT&nbsp;U</Text>
          </Section>
          <Section style={divider} />

          <Text style={text}>
            Hi {isAdmin ? "Joshua" : firstName(studentName)},
          </Text>
          <Text style={text}>
            {isAdmin
              ? "A new LSAT U session has been scheduled."
              : "Your LSAT U session has been scheduled."}
          </Text>

          <Section style={details}>
            <Detail label="Event type">{eventLabel}</Detail>
            <Detail label="Invitee">{studentName || "Student"}</Detail>
            {studentEmail && (
              <Detail label="Invitee Email">
                <Link href={`mailto:${studentEmail}`} style={link}>
                  {studentEmail}
                </Link>
              </Detail>
            )}
            <Detail label="Date and time">{whenText}</Detail>
            <Detail label="Duration">{durationMinutes} minutes</Detail>
            <Detail label="Timezone">{timezone}</Detail>
            <Detail label="Location">Google Meet</Detail>
          </Section>

          {!isAdmin && (
            <Text style={calendarCopy}>
              {calendarPending || !calendarUrl
                ? "Your booking is confirmed. The calendar invite and Meet link will follow shortly."
                : "Your Google Calendar invitation has been sent."}
            </Text>
          )}

          {hasSubmission && (
            <Section style={submissionCard}>
              <Text style={detailLabel}>STUDENT INCLUDED</Text>
              {studentNote && <Text style={noteText}>{studentNote}</Text>}
              {fileNames.length > 0 && (
                <>
                  <Text style={fileHeader}>
                    {fileNames.length} file{fileNames.length === 1 ? "" : "s"}
                    {" "}
                    attached
                  </Text>
                  {fileNames.map((name, index) => (
                    <Text key={index} style={fileItem}>{name}</Text>
                  ))}
                  <Text style={fileHint}>
                    Open the Bookings tab to download.
                  </Text>
                </>
              )}
            </Section>
          )}

          {meetUrl && (
            <Section style={actionSection}>
              <Button href={meetUrl} style={button}>
                Join with Google Meet
              </Button>
              <Text style={meetHint}>
                <Link href={meetUrl} style={link}>{meetUrl}</Link>
              </Text>
            </Section>
          )}

          {!isAdmin && cancelUrl && (
            <Text style={smallText}>
              Need to cancel?{" "}
              <Link href={cancelUrl} style={link}>Cancel this session</Link>.
              Cancellations do not trigger an automatic refund.
            </Text>
          )}

          <Text style={footer}>The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  );
}

function bookingSubject(data: Record<string, any>): string {
  const eventLabel = data?.eventLabel ?? "session";
  const whenText = data?.whenText ?? "";
  if (data?.recipientRole === "admin") {
    const student = data?.studentName ? ` - ${data.studentName}` : "";
    return `New ${eventLabel} booked${student} (${whenText})`;
  }
  return `Your ${eventLabel} with Joshua is scheduled - ${whenText}`;
}

export const template = {
  component: BookingConfirmationEmail,
  subject: bookingSubject,
  displayName: "Booking confirmation",
  previewData: {
    recipientRole: "student",
    studentName: "Alex Morgan",
    studentEmail: "alex@example.com",
    eventLabel: "LSAT Session",
    whenText: "Saturday, July 19 at 10:00 AM EDT",
    durationMinutes: 70,
    timezone: "America/Toronto",
    calendarUrl: "https://calendar.google.com/calendar/event?eid=example",
    meetUrl: "https://meet.google.com/abc-defg-hij",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#FFFFFF",
  color: "#242124",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: "0",
};
const container = {
  padding: "48px 24px 40px",
  maxWidth: "520px",
  margin: "0 auto",
};
const wordmarkSection = { textAlign: "center" as const };
const wordmark = {
  color: BURGUNDY,
  fontSize: "28px",
  fontWeight: "800",
  letterSpacing: "-0.03em",
  lineHeight: "1",
  margin: "0",
};
const divider = { borderTop: "1px dashed #D9D5D6", margin: "30px 0 42px" };
const text = {
  fontSize: "16px",
  color: "#2F2B2C",
  lineHeight: "1.55",
  margin: "0 0 16px",
};
const details = { margin: "24px 0 4px" };
const detailRow = { margin: "0 0 18px" };
const detailLabel = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#242124",
  lineHeight: "1.4",
  margin: "0 0 2px",
};
const detailValue = {
  fontSize: "15px",
  color: "#403A3C",
  lineHeight: "1.5",
  margin: "0",
};
const calendarCopy = { ...text, color: "#403A3C", margin: "24px 0 0" };
const link = { color: BURGUNDY, textDecoration: "underline" };
const actionSection = { textAlign: "center" as const, margin: "30px 0 26px" };
const button = {
  backgroundColor: BURGUNDY,
  borderRadius: "8px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700",
  padding: "13px 24px",
  textDecoration: "none",
};
const meetHint = {
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "12px 0 0",
  wordBreak: "break-all" as const,
};
const submissionCard = {
  backgroundColor: "#FAF8F8",
  border: "1px solid #E8E2E4",
  borderRadius: "8px",
  padding: "18px 20px",
  margin: "24px 0",
};
const noteText = {
  fontSize: "14px",
  color: "#403A3C",
  lineHeight: "1.6",
  margin: "6px 0 0",
  whiteSpace: "pre-wrap" as const,
};
const fileHeader = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#403A3C",
  margin: "14px 0 6px",
};
const fileItem = { fontSize: "13px", color: "#403A3C", margin: "3px 0" };
const fileHint = { fontSize: "12px", color: "#6E6568", margin: "9px 0 0" };
const smallText = {
  fontSize: "13px",
  color: "#6E6568",
  lineHeight: "1.55",
  margin: "24px 0 0",
};
const footer = { fontSize: "12px", color: "#837A7D", margin: "36px 0 0" };
