import { Link } from "react-router-dom";
import { Shield, Lock, Database, Mail, Cookie, UserCheck, AlertCircle, FileText } from "lucide-react";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Trust & Privacy
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">How LSAT U handles your data</h1>
          <p className="mt-4 text-muted-foreground">
            This page is maintained by the LSAT U team to answer common security and privacy
            questions about the app. It describes the controls and practices currently in place. It
            is not a certification and is not independently verified.
          </p>
        </header>

        <Section icon={UserCheck} title="Access & authentication">
          <ul className="list-disc space-y-2 pl-5">
            <li>Sign-in uses email and password, with Google sign-in as an option.</li>
            <li>Sessions are managed by our backend provider using signed JWTs.</li>
            <li>Each student can only access their own coursework, drafts, journal, and messages.</li>
            <li>Administrative actions are gated by a server-checked admin role; the role is stored in a dedicated table, not on profile records.</li>
          </ul>
        </Section>

        <Section icon={Lock} title="Data protection">
          <ul className="list-disc space-y-2 pl-5">
            <li>Traffic to the app is served over HTTPS.</li>
            <li>Row-level security policies are enabled on every user-facing database table so that one student's data is not visible to another.</li>
            <li>Sensitive credential hashes are not returned to the client.</li>
            <li>Service-role credentials are used only by server-side functions and are never shipped to the browser.</li>
          </ul>
        </Section>

        <Section icon={Database} title="What we collect & why">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Account:</strong> name, email, and authentication identifiers so you can sign in and we can contact you about your account.</li>
            <li><strong>Coursework:</strong> your drill attempts, journal entries, assignments, and messages with your instructor so we can power your study experience.</li>
            <li><strong>Operational logs:</strong> minimal request and error logs used to keep the service running.</li>
          </ul>
        </Section>

        <Section icon={Cookie} title="Cookies & analytics">
          <p>
            We use first-party cookies and local storage strictly to keep you signed in and to
            remember your settings. We do not sell your data.
          </p>
        </Section>

        <Section icon={FileText} title="Subprocessors">
          <p className="mb-3">
            We rely on the following providers to deliver the service. Each handles only the data
            necessary for its role:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Lovable Cloud / Supabase</strong> — database, authentication, storage, and serverless functions.</li>
            <li>
              <strong>Cloudflare Turnstile</strong> — bot and abuse protection for public booking
              forms. Cloudflare processes the data needed to perform the security check under its{" "}
              <a
                className="underline"
                href="https://www.cloudflare.com/turnstile-privacy-policy/"
                rel="noreferrer"
                target="_blank"
              >
                Turnstile Privacy Addendum
              </a>
              .
            </li>
            <li><strong>Google</strong> — optional Google sign-in, and Google Drive / Calendar features when you explicitly connect them.</li>
            <li><strong>Email delivery provider</strong> — sending transactional and account emails.</li>
          </ul>
        </Section>

        <Section icon={UserCheck} title="Retention & deletion">
          <p>
            We keep your account and coursework while your account is active so you can resume your
            studies. You can request deletion of your account and associated data at any time by
            contacting us at the address below.
          </p>
        </Section>

        <Section icon={AlertCircle} title="Reporting a security issue">
          <p>
            If you believe you've found a security vulnerability, please email us and give us a
            reasonable opportunity to investigate and respond before any public disclosure. Please
            do not run automated scans or attempt to access other users' data.
          </p>
        </Section>

        <Section icon={Mail} title="Contact">
          <p>
            For privacy, security, or data-deletion requests, email{" "}
            <a className="underline" href="mailto:support@lsatprep.study">
              support@lsatprep.study
            </a>
            .
          </p>
        </Section>

        <Section icon={Shield} title="Shared responsibility">
          <p>
            LSAT U is built on the Lovable platform, which provides hosting, the database, and
            authentication infrastructure. Platform-level capabilities (such as managed Postgres,
            row-level security, and HTTPS) are provided by Lovable / Supabase. Decisions about what
            data is collected, who at LSAT U can access it, retention, and account deletion are
            handled by the LSAT U team. You are responsible for keeping your password safe and for
            the accuracy of the information you submit.
          </p>
        </Section>

        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>
            This page is editable project content maintained by LSAT U. It is not a Lovable
            certification and does not represent an independent audit.
          </p>
          <p className="mt-2">
            <Link to="/" className="underline">
              Back to LSAT U
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
