import React from "react";
import { Navigate } from "react-router-dom";
import { useTags } from "../hooks/useReadingCenterData";
import { rcTagPath } from "../lib/routes";
import { TopBar } from "../components/AppShell";
import { MIcon } from "../components/Icon";

/** Spreeder library/tags/: opens the first tag; with no tags, the "Nothing here yet." screen. */
export default function TagsPage(): React.ReactElement | null {
  const tags = useTags();
  if (tags.isLoading) return null;
  if (tags.error) return <div className="p-6" role="alert">Your saved tags could not load. <button type="button" className="underline" onClick={() => void tags.refetch()}>Try again</button></div>;
  const first = tags.data?.[0];
  if (first) return <Navigate to={rcTagPath(first.name)} replace />;
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Organize your articles</h1>
        <p className="mt-4 leading-relaxed">Tags group articles by subject or reading goal, such as Science, Law, or Read again. Create a tag, then use an article's menu in My Library to add it. Select a tag to see those articles together.</p>
        <p className="mt-4 text-sm">Use Create New Tag in the menu to get started.</p>
      </div>
    </div>
  );
}

export function NothingHereYet(): React.ReactElement {
  return (
    <div className="flex flex-col items-center pt-[73px] text-center">
      <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: "var(--rc-empty-circle)" }}>
        <MIcon name="list_alt" size={100} style={{ color: "#fff" }} />
      </div>
      <div className="mt-5 text-[28px] leading-[26px]" style={{ color: "var(--rc-strong)" }}>Nothing here yet.</div>
      <div className="mt-5 text-base font-medium" style={{ color: "var(--rc-strong)" }}>Please try a different option.</div>
    </div>
  );
}
