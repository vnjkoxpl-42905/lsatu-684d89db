/**
 * One-off booking links: mint a URL that sells exactly one session, at a price
 * you set, and then stops working.
 *
 * A one-off link is not a new booking system. It is a row in
 * `booking_event_types` -- the same table that defines the ordinary session and
 * the consultation -- with a random slug and `single_use` set. Every layer
 * beneath it (the page, the edge function, the slot policy, the claim
 * transaction) is already keyed by event slug, so the link books through
 * exactly the code a normal session books through.
 *
 * Two knobs make it useful for short notice:
 *
 *   --at      pins one exact time. The link offers only that time, and the
 *             notice, window and weekly-hours rules do not apply -- you already
 *             decided this hour is fine by choosing it. A genuine clash with
 *             your calendar still blocks it, both here and at booking time.
 *   --notice  how far ahead someone must book, in minutes. 0 means "any time
 *             from now". Only meaningful without --at.
 *
 *   npx vite-node scripts/booking-link.ts -- --for "Dakota" --price 45 --at "2026-09-10 18:00"
 *   npx vite-node scripts/booking-link.ts -- --for "Dakota" --price 60 --notice 0 --window 3
 *   npx vite-node scripts/booking-link.ts -- --list
 *   npx vite-node scripts/booking-link.ts -- --revoke session-x7k2m9qp4rtv
 *
 * Credentials are read from ~/ai-os/.env (git-ignored), never from this repo's
 * .env, which IS tracked in git. Same convention as scripts/assign.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_ORIGIN = "https://lsatprep.study";

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = {
  ...readEnv(path.resolve(REPO, "../../.env")),
  ...readEnv(path.join(REPO, ".env")),
};

// ---------------------------------------------------------------- arguments

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const USAGE =
  "usage: vite-node scripts/booking-link.ts -- \\\n" +
  "         --for <name> --price <dollars> [--at \"YYYY-MM-DD HH:mm\"] [--minutes 70]\\\n" +
  "         [--notice <minutes>] [--window <business days>] [--label <text>] [--note <text>]\\\n" +
  "       vite-node scripts/booking-link.ts -- --list\\\n" +
  "       vite-node scripts/booking-link.ts -- --revoke <slug>";

// ------------------------------------------------------------------- timezone

/** How far `tz` is from UTC at that instant, in milliseconds. */
function tzOffsetMs(tz: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const at = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
  const asUtc = Date.UTC(+at.year, +at.month - 1, +at.day, +at.hour % 24, +at.minute, +at.second);
  return asUtc - date.getTime();
}

/**
 * A wall-clock time in Joshua's timezone, as a real instant. Done in two passes
 * because the offset itself depends on the instant: a naive single pass lands an
 * hour out on the two days a year the clocks move.
 */
function hostWallClockToUtc(tz: string, text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) {
    const iso = new Date(text);
    return Number.isFinite(iso.getTime()) ? iso : null;
  }
  const [, y, mo, d, h, mi] = match;
  const naive = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const first = naive - tzOffsetMs(tz, new Date(naive));
  const second = naive - tzOffsetMs(tz, new Date(first));
  return new Date(second);
}

function inHostTz(tz: string, iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

// ----------------------------------------------------------------- the slug

// No 0/O/1/l/i: these get read aloud and typed by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomTail(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * Short enough to send in a text, and nothing but the secret.
 *
 * The name is deliberately not in the slug. It would lengthen a URL that gets
 * read aloud and retyped, and it would put a student's name in anything that
 * logs the path. Who a link is for is kept in `note`, admin-side.
 */
function slugFor(): string {
  return randomTail(10);
}

// -------------------------------------------------------------------- signin

async function signIn(): Promise<void> {
  const email = env.LSATPREP_ADMIN_EMAIL;
  const password = env.LSATPREP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error(
      "booking-link: LSATPREP_ADMIN_EMAIL / LSATPREP_ADMIN_PASSWORD are not set.\n" +
        "  Add them to ~/ai-os/.env (git-ignored). This repo's .env is TRACKED in git,\n" +
        "  so a credential placed there would be committed.",
    );
    process.exit(2);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`booking-link: sign-in failed: ${error.message}`);
    process.exit(1);
  }
}

async function hostTimezone(): Promise<string> {
  const { data } = await supabase.from("booking_availability_config").select("timezone").eq("id", 1).maybeSingle();
  return data?.timezone || "America/Toronto";
}

/**
 * The times this link can actually sell, asked of the booking engine itself.
 *
 * This is deliberately not a reimplementation of the availability rules. The
 * `slots` action unions the mirrored calendar, live Google free/busy and every
 * held session -- none of which is reachable from a script -- so asking it is
 * the only way to know a pinned time is genuinely free. An empty answer for a
 * pinned link means exactly one thing: that hour is already taken.
 */
async function slotsFor(slug: string): Promise<{ start_at: string }[]> {
  const { data, error } = await supabase.functions.invoke("single-session", {
    body: { action: "slots", event: slug },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return ((data as { slots?: { start_at: string }[] }).slots) ?? [];
}

// --------------------------------------------------------------------- modes

async function list(tz: string): Promise<void> {
  const { data, error } = await supabase
    .from("booking_event_types")
    .select("slug,label,length_minutes,price_cents,active,pinned_start_at,note,created_at")
    .eq("single_use", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) {
    console.log("No one-off links yet.");
    return;
  }
  for (const row of data) {
    const spent = await supabase.rpc("booking_event_is_spent", { _event_slug: row.slug });
    const state = !row.active ? "revoked" : spent.data === true ? "used" : "open";
    console.log(
      `${state.padEnd(8)} ${`$${(row.price_cents / 100).toFixed(2)}`.padEnd(9)} ${String(row.length_minutes).padStart(3)}m  ` +
        `${row.pinned_start_at ? inHostTz(tz, row.pinned_start_at) : "any open time"}\n` +
        `         ${APP_ORIGIN}/book/x/${row.slug}${row.note ? `\n         ${row.note}` : ""}\n`,
    );
  }
}

async function revoke(slug: string): Promise<void> {
  const { data, error } = await supabase
    .from("booking_event_types")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .eq("single_use", true)
    .select("slug")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    console.error(`booking-link: no one-off link with slug "${slug}".`);
    process.exit(1);
  }
  console.log(`Revoked. ${APP_ORIGIN}/book/x/${slug} no longer resolves.`);
}

async function create(tz: string): Promise<void> {
  const forName = arg("for");
  const priceText = arg("price");
  if (!forName || !priceText) {
    console.error(USAGE);
    process.exit(2);
  }

  const price = Number(priceText);
  if (!Number.isFinite(price) || price <= 0) {
    console.error("--price must be a positive number of dollars, e.g. --price 45");
    process.exit(2);
  }
  const priceCents = Math.round(price * 100);

  const minutes = Number(arg("minutes") ?? 70);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    console.error("--minutes must be a whole number of minutes");
    process.exit(2);
  }

  const atText = arg("at");
  let pinnedStartAt: string | null = null;
  if (atText) {
    const pinned = hostWallClockToUtc(tz, atText);
    if (!pinned) {
      console.error(`--at must be "YYYY-MM-DD HH:mm" (in ${tz}) or a full ISO timestamp, got "${atText}"`);
      process.exit(2);
    }
    if (pinned.getTime() <= Date.now()) {
      console.error(`--at is in the past: ${inHostTz(tz, pinned.toISOString())}`);
      process.exit(2);
    }
    pinnedStartAt = pinned.toISOString();
  }

  // A pinned link has already answered the notice question, so the column only
  // matters for a picker link. Without --at, the default stays the ordinary 24
  // hours rather than silently loosening every link that omits the flag.
  const notice = Number(arg("notice") ?? (pinnedStartAt ? 0 : 1440));
  const window = Number(arg("window") ?? 6);
  if (!Number.isInteger(notice) || notice < 0 || !Number.isInteger(window) || window <= 0) {
    console.error("--notice must be >= 0 minutes and --window a positive number of business days");
    process.exit(2);
  }

  const slug = slugFor();
  const row = {
    slug,
    label: arg("label") ?? "LSAT Session",
    length_minutes: minutes,
    slot_interval_minutes: null,
    minimum_notice_minutes: notice,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    window_business_days: window,
    price_cents: priceCents,
    currency: "usd",
    requires_payment: true,
    active: true,
    single_use: true,
    pinned_start_at: pinnedStartAt,
    note: arg("note") ?? `One-off link for ${forName}.`,
  };

  const { error } = await supabase.from("booking_event_types").insert(row);
  if (error) throw error;

  // Ask the booking engine what this link can sell. A pinned link that comes
  // back empty clashes with something already on the calendar, and a link that
  // would fail the moment it was opened is worse than no link -- so it is
  // deleted rather than handed over. Nothing has seen the URL yet.
  let slots: { start_at: string }[];
  try {
    slots = await slotsFor(slug);
  } catch (problem) {
    await supabase.from("booking_event_types").delete().eq("slug", slug);
    throw problem;
  }

  if (!slots.length) {
    await supabase.from("booking_event_types").delete().eq("slug", slug);
    console.error(
      pinnedStartAt
        ? `booking-link: ${inHostTz(tz, pinnedStartAt)} clashes with something already on your calendar. No link was created.`
        : "booking-link: this link would have no open times at all (check your weekly hours and window). No link was created.",
    );
    process.exit(1);
  }

  const url = `${APP_ORIGIN}/book/x/${slug}`;
  console.log(`\n  ${url}\n`);
  console.log(`  ${forName} · $${(priceCents / 100).toFixed(2)} · ${minutes} minutes`);
  console.log(
    pinnedStartAt
      ? `  Books ${inHostTz(tz, pinnedStartAt)} and only that time.`
      : `  ${slots.length} open time${slots.length === 1 ? "" : "s"}, first ${inHostTz(tz, slots[0].start_at)}` +
          `${notice === 0 ? " (no minimum notice)" : ` (${notice} minutes' notice)`}.`,
  );
  console.log("  Sells one session, then closes.\n");
}

// ---------------------------------------------------------------------- main

async function main(): Promise<void> {
  await signIn();
  const tz = await hostTimezone();
  const revokeSlug = arg("revoke");
  if (has("list")) return list(tz);
  if (revokeSlug) return revoke(revokeSlug);
  return create(tz);
}

main()
  .then(() => process.exit(0))
  .catch((problem) => {
    console.error(`booking-link: ${problem instanceof Error ? problem.message : String(problem)}`);
    process.exit(1);
  });
