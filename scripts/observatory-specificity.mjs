/**
 * Scope the drill hub's CSS under .drill-observatory-root so it wins the
 * cascade by specificity instead of by force.
 *
 * The observatory rules compete with shadcn's Card and Button, which style
 * themselves with Tailwind utilities. A utility is a single class, (0,1,0), and
 * so were most observatory rules, so whoever came last won and the author
 * reached for !important 192 times. Prefixing a rule with the root class makes
 * it (0,2,0), which beats any utility on specificity alone and leaves the
 * cascade working normally for anything that legitimately needs to override.
 *
 * Two things are deliberately left alone:
 *
 *   1. The prefers-reduced-motion block. Its !important is the switch that
 *      turns animation OFF for a reader who asked their OS for less motion. It
 *      has to beat a later, equally specific animation rule, and specificity
 *      cannot promise that. Weakening it to win a counting exercise would trade
 *      an accessibility guarantee for a smaller number.
 *   2. Selectors that do not start with .drill-observatory-, and ones already
 *      scoped to the root. The only one of the former is
 *      .classroom-root.classroom-root-drill .classroom-stage at (0,3,0), which
 *      is already stronger than any utility.
 *
 * Idempotent: running it twice changes nothing the second time.
 *
 *   node scripts/observatory-specificity.mjs [--check]
 *
 * --check exits 1 if the file would change, for use as a guard.
 */
import fs from "node:fs";
import postcss from "postcss";

const FILE = "src/components/classroom/classroom.css";
const ROOT_CLASS = ".drill-observatory-root";
const PREFIX = `${ROOT_CLASS} `;
const END_MARKER = "end observatory";
const check = process.argv.includes("--check");

const css = fs.readFileSync(FILE, "utf8");
const ast = postcss.parse(css);

/* The block runs from the rule that declares the root's tokens to the
   `end observatory` comment. Both are required: guessing the boundary by line
   number would silently rewrite whatever the file grows next. */
const startIdx = ast.nodes.findIndex(
  (n) => n.type === "rule" && n.selector.trim() === ROOT_CLASS,
);
const endIdx = ast.nodes.findIndex(
  (n) => n.type === "comment" && n.text.trim() === END_MARKER,
);

if (startIdx < 0) throw new Error(`Could not find the "${ROOT_CLASS}" rule that opens the block.`);
if (endIdx < 0) throw new Error(`Could not find the "/* ${END_MARKER} */" marker that closes the block.`);
if (endIdx < startIdx) throw new Error("The end marker sits before the opening rule.");

const stats = { rules: 0, selectorsPrefixed: 0, importantStripped: 0, importantKept: 0 };

const scopeSelector = (selector) => {
  const s = selector.trim();
  if (!s.startsWith(".drill-observatory-")) return s; // already stronger, or not ours
  if (s === ROOT_CLASS || s.startsWith(PREFIX)) return s; // already scoped
  stats.selectorsPrefixed += 1;
  return PREFIX + s;
};

const visit = (node, inReducedMotion) => {
  if (node.type === "rule") {
    stats.rules += 1;
    node.selectors = node.selectors.map(scopeSelector);
    node.walkDecls((decl) => {
      if (!decl.important) return;
      if (inReducedMotion) {
        stats.importantKept += 1;
        return;
      }
      decl.important = false;
      stats.importantStripped += 1;
    });
    return;
  }
  if (node.type === "atrule") {
    const reduced = inReducedMotion || /prefers-reduced-motion/.test(node.params || "");
    node.each((child) => visit(child, reduced));
  }
};

for (let i = startIdx; i < endIdx; i += 1) visit(ast.nodes[i], false);

const out = ast.toString();
const changed = out !== css;

const countImportant = (text) => (text.match(/!important/g) || []).length;

console.log(`observatory block: nodes ${startIdx}..${endIdx}`);
console.log(`  rules visited        ${stats.rules}`);
console.log(`  selectors scoped     ${stats.selectorsPrefixed}`);
console.log(`  !important stripped  ${stats.importantStripped}`);
console.log(`  !important kept      ${stats.importantKept} (prefers-reduced-motion)`);
console.log(`  file !important      ${countImportant(css)} -> ${countImportant(out)}`);

if (check) {
  if (changed) {
    console.error("FAIL: the observatory block is not scoped. Run without --check.");
    process.exit(1);
  }
  console.log("OK: already scoped.");
  process.exit(0);
}

if (!changed) {
  console.log("No change; already scoped.");
} else {
  fs.writeFileSync(FILE, out);
  console.log(`Wrote ${FILE}.`);
}
