import type { Verdict } from "../../api/types";
import { parseRouting } from "./routing";

export interface DiagramSide {
  text: string;
  /** Negates the complete authored idea, exactly as a paper diagram would. */
  inverted: boolean;
}

export interface DiagramRoute {
  ifSide: DiagramSide;
  thenSide: DiagramSide;
}

export interface PaperDiagramChoice {
  id: string;
  routes: DiagramRoute[];
  responseText: string;
  verdict: Verdict;
  feedback: string;
}

function parseRoutes(answer: string): DiagramRoute[] | null {
  const parts = answer.split(/;\s*and\s+(?=if\b)/i);
  const routes = parts.map((part) => parseRouting(part));
  if (routes.some((route) => !route)) return null;

  return routes.map((route) => ({
    ifSide: { text: route!.ifClause.text, inverted: false },
    thenSide: { text: route!.thenClause.text, inverted: false },
  }));
}

function flip(routes: DiagramRoute[]): DiagramRoute[] {
  return routes.map((route) => ({
    ifSide: { ...route.thenSide, inverted: !route.thenSide.inverted },
    thenSide: { ...route.ifSide, inverted: !route.ifSide.inverted },
  }));
}

function reverse(routes: DiagramRoute[]): DiagramRoute[] {
  return routes.map((route) => ({
    ifSide: { ...route.thenSide },
    thenSide: { ...route.ifSide },
  }));
}

function invert(routes: DiagramRoute[]): DiagramRoute[] {
  return routes.map((route) => ({
    ifSide: { ...route.ifSide, inverted: !route.ifSide.inverted },
    thenSide: { ...route.thenSide, inverted: !route.thenSide.inverted },
  }));
}

function changeOneSide(routes: DiagramRoute[]): DiagramRoute[] {
  return routes.map((route, index) => ({
    ifSide: { ...route.ifSide },
    thenSide: {
      ...route.thenSide,
      inverted: index === 0 ? !route.thenSide.inverted : route.thenSide.inverted,
    },
  }));
}

function sideText(side: DiagramSide): string {
  return side.inverted ? `NOT (${side.text})` : side.text;
}

export function diagramResponseText(routes: DiagramRoute[]): string {
  return routes
    .map((route) => `If ${sideText(route.ifSide)}, then ${sideText(route.thenSide)}.`)
    .join(" And ");
}

function shuffled<T>(values: T[], seed: number): T[] {
  const result = [...values];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const target = Math.floor((state / 233280) * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/**
 * Five paper-diagram reads of one authored conditional. Two preserve the rule:
 * the direct form and its contrapositive. The other three are the mistakes this
 * drill teaches students to catch. The order is stable per item but not
 * predictable from one question to the next.
 */
export function buildPaperDiagramChoices(
  creditedAnswers: string[],
  itemOrder: number,
): PaperDiagramChoice[] {
  const direct = parseRoutes(creditedAnswers[0] ?? "");
  if (!direct) return [];

  const candidates: Array<Omit<PaperDiagramChoice, "responseText">> = [
    {
      id: "direct",
      routes: direct,
      verdict: "correct",
      feedback: "That matches the statement's direction and polarity.",
    },
    {
      id: "contrapositive",
      routes: flip(direct),
      verdict: "correct",
      feedback: "That is the contrapositive. It states the same rule.",
    },
    {
      id: "reversal",
      routes: reverse(direct),
      verdict: "partial",
      feedback: "That runs the arrow backwards. A necessary condition is not automatically sufficient.",
    },
    {
      id: "inverse",
      routes: invert(direct),
      verdict: "partial",
      feedback: "That negates both sides without swapping them. Negate and swap to form the contrapositive.",
    },
    {
      id: "polarity",
      routes: changeOneSide(direct),
      verdict: "partial",
      feedback: "One side changed polarity. Keep the original polarity unless you negate both sides and swap them.",
    },
  ];

  return shuffled(
    candidates.map((choice) => ({
      ...choice,
      responseText: diagramResponseText(choice.routes),
    })),
    itemOrder,
  );
}
