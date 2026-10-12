/**
 * A preview harness for the section launch surface. Development only.
 *
 * It exists so the component can be looked at in a real browser, in every state
 * and at every breakpoint, without signing in and without a graded section
 * sitting in the database. Only the network is stubbed: `window.fetch` is
 * replaced before anything imports the Supabase client, so the component, the
 * client helper and the derivation all run exactly as they do in the product.
 *
 * Not routed and not imported by the app. Reached at
 * `/src/dev/section-launch-preview.html` on the dev server. It is not an entry
 * point in the Vite build, which only builds `index.html`, so it never ships.
 *
 * States: ?state=runs|oneRun|empty|failed|noHistory|library  ·  ?theme=light|dark
 */
import { createRoot } from "react-dom/client";
// The section JSONs deliberately ship an empty instructions block -- the rules
// are authored once, in one file, and copied in at seed time -- so the harness
// reads the same instructions file the migration seeds.
import sectionInstructions from "../features/activity-centre/content/read-recall-colour-section.instructions.json";
import type { ActivityInstructions } from "../features/activity-centre/api/types";

const params = new URLSearchParams(location.search);
const state = params.get("state") ?? "runs";
const theme = params.get("theme") ?? "light";

function stim(item_order: number, over: Record<string, unknown> = {}) {
  return {
    slug: `s${item_order}`,
    item_order,
    carried: 3,
    total: 3,
    percent: 100,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    spoken: "she said something here",
    ...over,
  };
}

const SLOTS = 25;
function run(seconds: number, createdAt: string, gaps: number[] = [], silent: number[] = []) {
  return {
    assignment_id: `assign-${seconds}`,
    attempt_no: 1,
    source_section: "PT105.S2",
    graded_at: createdAt,
    created_at: createdAt,
    stimuli: Array.from({ length: SLOTS }, (_, i) => {
      const n = i + 1;
      if (silent.includes(n)) return stim(n, { spoken: "", carried: 0, percent: 0 });
      if (gaps.includes(n)) return stim(n, { ungraded: "judge returned nothing" });
      return stim(n);
    }),
    section: {
      accommodation: "standard",
      goal_minutes: 25,
      total_seconds: seconds,
      within_time: seconds <= 1500,
      within_goal: seconds <= 1500,
      mean_coverage: 91,
      stimuli_graded: SLOTS,
      stimuli_in_section: SLOTS,
      reciting_count: 0,
      listing_count: 0,
      uncoloured_count: 0,
      worst_dead_air_seconds: 4,
      dead_air_threshold_seconds: 8,
      decoy_failures: 0,
      clock: {},
    },
  };
}

const FIXTURE = [
  run(1450, "2026-09-02T09:00:00Z"),
  run(1665, "2026-09-01T09:00:00Z"),
  run(1862, "2026-08-31T09:00:00Z", [9, 17], [4, 21]),
];

// Stubbed before the Supabase client is imported below, so the real client
// builds the real request and this answers it.
const realFetch = window.fetch.bind(window);
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("activity_section_grades")) {
    if (state === "failed") {
      return new Response(JSON.stringify({ code: "42501", message: "permission denied" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const body =
      state === "empty" ? [] : state === "oneRun" ? [FIXTURE[0]] : FIXTURE;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return realFetch(input, init);
}) as typeof window.fetch;

if (theme === "dark") document.documentElement.classList.add("dark");

/*
 * The library door renders the pure list, not the router-wired panel: the
 * harness has no router and no session, and the half worth looking at is the
 * page, not the navigation.
 */
async function bootLibrary() {
  const { SectionLibraryLaunch } = await import(
    "../features/activity-centre/components/SectionLibraryLaunch"
  );
  const { SectionLibrary } = await import(
    "../features/activity-centre/components/SectionLibrary"
  );
  await import("../index.css");
  document.body.style.margin = "0";
  const choices = [
    { id: "a1", source_section: "PT105.S2", goal_minutes: { standard: 25 } },
    { id: "a2", source_section: "PT102.S3", goal_minutes: { standard: 25 } },
    { id: "a3", source_section: "PT1.S3", goal_minutes: { standard: 25 } },
  ];
  const attempts = [
    { id: "r1", mode: "section", source_section: "PT105.S2", status: "completed",
      created_at: "2026-09-02T09:00:00Z", completed_at: "2026-09-02T09:25:00Z" },
    { id: "r2", mode: "section", source_section: "PT105.S2", status: "completed",
      created_at: "2026-08-31T09:00:00Z", completed_at: "2026-08-31T09:31:00Z" },
    { id: "r3", mode: "section", source_section: "PT102.S3", status: "in_progress",
      created_at: "2026-09-01T09:00:00Z", completed_at: null },
    /*
     * A section Joshua assigned that she has not opened.
     *
     * Yahunathan's case on 2026-09-08: eight of these, one per section, each
     * with its own message. It must read "Not run yet." and "Start", never
     * "Attempt 1 - not finished" and "Run it again".
     */
    { id: "r4", mode: "section", source_section: "PT1.S3", status: "assigned",
      created_at: "2026-09-08T15:15:00Z", started_at: null, completed_at: null },
  ];
  const grades = [
    { assignment_id: "r1", attempt_no: 1, source_section: "PT105.S2",
      graded_at: "2026-09-02T09:40:00Z", section: { mean_coverage: 91 } },
  ];
  createRoot(document.getElementById("root")!).render(
    <SectionLibraryLaunch
      title="Read, Recall, Colour"
      subtitle={null}
      instructions={sectionInstructions as unknown as ActivityInstructions}
      onExit={() => console.log("[preview] exit")}
    >
      <SectionLibrary
        attempts={attempts as never}
        onStart={(id) => console.log("[preview] start", id)}
        onOpenAttempt={(id) => console.log("[preview] open", id)}
        loadChoices={() => Promise.resolve(choices as never)}
        loadGrades={() => Promise.resolve(grades as never)}
        beginAttempt={(id) => Promise.resolve(`new-${id}`)}
      />
    </SectionLibraryLaunch>,
  );
}

async function boot() {
  if (state === "library") return bootLibrary();
  const { SectionLaunch } = await import(
    "../features/activity-centre/components/SectionLaunch"
  );
  await import("../index.css");
  document.body.style.margin = "0";
  createRoot(document.getElementById("root")!).render(
    <SectionLaunch
      title="Read, Recall, Colour"
      subtitle="PT105 Section 2"
      instructions={sectionInstructions as unknown as ActivityInstructions}
      itemCount={SLOTS}
      timeGoalMinutes={25}
      sourceSection="PT105.S2"
      studentId="preview-student"
      showHistory={state !== "noHistory"}
      onStart={() => console.log("[preview] start")}
    />,
  );
}

void boot();
