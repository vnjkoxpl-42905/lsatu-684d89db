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

export function flip(routes: DiagramRoute[]): DiagramRoute[] {
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
  return side.inverted ? `not ${side.text}` : side.text;
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
 * Compare truth tables over the complete authored clauses. A compound remains
 * one complete idea here; negating it never drops one of its parts. This also
 * catches the less obvious duplicate: a converse and an inverse are equivalent.
 */
export function diagramSignature(routes: DiagramRoute[], atoms: string[]): string {
  return Array.from({ length: 2 ** atoms.length }, (_, mask) => {
    const value = (side: DiagramSide) => Boolean(mask & (1 << atoms.indexOf(side.text))) !== side.inverted;
    return routes.every((route) => !value(route.ifSide) || value(route.thenSide)) ? "1" : "0";
  }).join("");
}

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
    {
      id: "trigger-polarity",
      routes: direct.map((route) => ({ ...route, ifSide: { ...route.ifSide, inverted: !route.ifSide.inverted } })),
      verdict: "partial",
      feedback: "The trigger has changed. Check which condition actually starts this rule.",
    },
    {
      id: "both-directions",
      routes: [...direct, ...reverse(direct)],
      verdict: "partial",
      feedback: "This adds a reverse direction that the statement does not guarantee.",
    },
  ];

  // Two-way rules need missing-direction choices, not a falsely rejected
  // converse. Other multi-rule items can likewise lose one entire premise.
  if (direct.length > 1) {
    direct.forEach((route, index) => candidates.push({
      id: `one-rule-${index}`,
      routes: [route],
      verdict: "partial",
      feedback: "This keeps only part of the statement. Your diagram must express every stated rule.",
    }));
  }
  const atoms = [...new Set(direct.flatMap((route) => [route.ifSide.text, route.thenSide.text]))];
  const seen = new Set<string>();
  const distinct = candidates.filter((choice) => {
    const signature = diagramSignature(choice.routes, atoms);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  }).slice(0, 5);
  // Custom authored tautologies may not support five different diagrams.
  // Preserve the caller's existing fallback rather than crash the activity.
  if (distinct.length !== 5) return [];

  return shuffled(
    distinct.map((choice) => ({
      ...choice,
      responseText: diagramResponseText(choice.routes),
    })),
    itemOrder,
  );
}
