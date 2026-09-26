"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuestionFinder from "./QuestionFinder";
import type { QuestionFinderBank } from "./questionFinderSearch";
import {
  useFinderAddressIndex,
  type FinderAddressSection,
} from "./useFinderAddressIndex";
import "./questionFinder.css";
import "./questionJump.css";

export interface QuestionJumpProps {
  /** Where a finished one-question attempt returns to. */
  returnTo: string;
  /** The host's surface, passed straight through to the search panel. */
  tone?: "light" | "dark";
  /** Active side of the hub switch. */
  bank?: QuestionFinderBank;
  /**
   * Whether the text-search trigger rides at the end of the address row.
   *
   * The drill hub hosts it in the tools row instead, beside the LR/RC switch,
   * so the two utility controls sit on one line rather than stacked. Everywhere
   * else the trigger stays where it was born: at the end of this row.
   */
  withSearch?: boolean;
}

/**
 * The Question jump: PrepTest, section, question — three dropdowns, always open.
 *
 * The same three selectors used to be one panel deep, behind the finder's
 * trigger, which made the most ordinary request a student has ("open PT 90,
 * section 1, question 12") cost a click, a search field, and a decision about
 * what to type. LSAT Lab and 7Sage both put these three in the open, and so
 * does this: pick a test, pick a section, pick a question, and you are in it.
 *
 * It is a sibling of the finder, not a replacement. Addresses are what this
 * row does; searching question *text* is still the panel's job, and its trigger
 * sits at the end of the row.
 *
 * The third select always lists official question numbers. LR opens the chosen
 * question in the drill runner; RC opens its passage at the chosen question.
 */
export default function QuestionJump({
  returnTo,
  tone = "light",
  bank,
  withSearch = true,
}: QuestionJumpProps) {
  const navigate = useNavigate();
  const { tests, loading, failed } = useFinderAddressIndex();

  const [pt, setPt] = React.useState("");
  const [section, setSection] = React.useState("");

  const availableTests = React.useMemo(
    () =>
      bank
        ? tests.filter((test) =>
            test.sections.some((entry) =>
              bank === "rc" ? entry.rc.length > 0 : entry.lr.length > 0,
            ),
          )
        : tests,
    [bank, tests],
  );

  const sections = React.useMemo<FinderAddressSection[]>(() => {
    if (!pt) return [];
    const all = availableTests.find((test) => test.pt === Number(pt))?.sections ?? [];
    if (!bank) return all;
    return all.filter((entry) => (bank === "rc" ? entry.rc.length > 0 : entry.lr.length > 0));
  }, [availableTests, bank, pt]);

  const activeSection = React.useMemo(
    () => (section ? sections.find((s) => s.section === Number(section)) ?? null : null),
    [section, sections],
  );

  const isRc = !!activeSection && activeSection.lr.length === 0 && activeSection.rc.length > 0;

  const rcQuestions = React.useMemo(
    () =>
      (activeSection?.rc ?? []).flatMap((passage) =>
        (passage.questions ?? []).map((question) => ({ ...question, passage })),
      ),
    [activeSection],
  );

  const thirdLabel = "Question number";

  const openLr = (qnum: string) => {
    const params = new URLSearchParams({
      mode: "type-drill",
      qids: `PT${pt}-S${section}-Q${qnum}`,
      present: "smart",
      returnTo,
    });
    navigate(`/drill?${params.toString()}`);
  };

  const openRc = (target: string) => {
    const [passageId, questionId] = target.split(":");
    const params = new URLSearchParams({ passage: passageId });
    if (questionId) params.set("q", questionId);
    navigate(`/rc/drill?${params.toString()}`);
  };

  const thirdDisabled = loading || !activeSection;
  const thirdPlaceholder = !pt
    ? "Pick a test"
    : !section
      ? "Pick a section"
      : isRc
        ? "Question"
        : "Question";

  return (
    <div className="qj" data-tone={tone}>
      <div className="qj-row" data-search={withSearch ? "true" : "false"} role="group" aria-label="Jump to a question by PrepTest, section, and number">
        <div className="qf-field qj-field">
          <span className="qf-field-label" id="qj-test-label">PrepTest</span>
          <Select
            value={pt}
            disabled={loading || failed}
            onValueChange={(value) => {
              setPt(value);
              setSection("");
            }}
          >
            <SelectTrigger className="qj-trigger" aria-labelledby="qj-test-label">
              <SelectValue placeholder={failed ? "Unavailable" : loading ? "Loading…" : "PrepTest"} />
            </SelectTrigger>
            <SelectContent className={tone === "dark" ? "qj-menu qj-menu-dark" : "qj-menu"} position="popper">
              {availableTests.map((test) => (
                <SelectItem key={test.pt} value={String(test.pt)}>PT {test.pt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="qf-field qj-field">
          <span className="qf-field-label" id="qj-section-label">Section</span>
          <Select
            value={section}
            disabled={loading || !pt}
            onValueChange={setSection}
          >
            <SelectTrigger className="qj-trigger" aria-labelledby="qj-section-label">
              <SelectValue placeholder={pt ? "Section" : "Pick a test"} />
            </SelectTrigger>
            <SelectContent className={tone === "dark" ? "qj-menu qj-menu-dark" : "qj-menu"} position="popper">
              {sections.map((entry) => (
                <SelectItem key={entry.section} value={String(entry.section)}>
                  Section {entry.section}{entry.lr.length === 0 && entry.rc.length > 0 ? " · RC" : " · LR"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value stays "" on purpose: this select is an action, not a stored
            choice. Picking navigates away, and if the student comes back the
            row should read as untouched rather than claim they are still
            sitting on question 12. */}
        <div className="qf-field qj-field">
          <span className="qf-field-label" id="qj-question-label">{thirdLabel}</span>
          <Select
            value=""
            disabled={thirdDisabled}
            onValueChange={(value) => {
              if (isRc) openRc(value);
              else openLr(value);
            }}
          >
            <SelectTrigger className="qj-trigger" aria-labelledby="qj-question-label">
              <SelectValue placeholder={thirdPlaceholder} />
            </SelectTrigger>
            <SelectContent className={tone === "dark" ? "qj-menu qj-menu-dark" : "qj-menu"} position="popper">
            {isRc
              ? rcQuestions.map((question) => (
                  <SelectItem key={question.id} value={`${question.passage.id}:${question.id}`}>
                    Question {question.number} · Passage {question.passage.position}
                  </SelectItem>
                ))
              : (activeSection?.lr ?? []).map((qnum) => (
                  <SelectItem key={qnum} value={String(qnum)}>
                    Question {qnum}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {withSearch ? (
          <div className="qj-search">
            <QuestionFinder returnTo={returnTo} tone={tone} bank={bank} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
