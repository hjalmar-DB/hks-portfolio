/**
 * Copy fixes, idempotent. Run before scripts/build.mjs:
 *   - drops the ↗ on "Heimsækja vefsíðuna" (it shows as a cheap emoji on iPhone)
 *   - home portfolio heading becomes "Traustir samstarfsaðilar."
 *   - removes the subline "Síðan sem er komin í loftið." (and the older "á lofti" wording)
 *     and any earlier "Verk eftir WOBO." heading
 *
 * The visible arrow is removed only. The sr-only " (opnast í nýjum flipa)" stays.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const MARK = "/*WOBO_COPYFIX*/";

const ARROW_JS_FROM =
  "`Heimsækja vefsíðuna `,(0,A.jsx)(`span`,{\"aria-hidden\":`true`,children:`↗`}),(0,A.jsx)(`span`,{className:`sr-only`,children:` (opnast í nýjum flipa)`})";
const ARROW_JS_TO =
  "`Heimsækja vefsíðuna`,(0,A.jsx)(`span`,{className:`sr-only`,children:` (opnast í nýjum flipa)`})";

const ARROW_HTML_FROM =
  'Heimsækja vefsíðuna <span aria-hidden="true">↗</span><span class="sr-only"> (opnast í nýjum flipa)</span>';
const ARROW_HTML_TO =
  'Heimsækja vefsíðuna<span class="sr-only"> (opnast í nýjum flipa)</span>';

const HEAD_JS_FROM = [
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Sjáðu hvað við höfum gert.`}),(0,A.jsx)(`p`,{children:`Síðan sem er komin í loftið.`})",
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Sjáðu hvað við höfum gert.`}),(0,A.jsx)(`p`,{children:`Síðan sem er á lofti.`})",
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Verk eftir WOBO.`})",
];
const HEAD_JS_TO =
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Traustir samstarfsaðilar.`})";

const HEAD_HTML_FROM = [
  '<h2 id="work-title">Sjáðu hvað við höfum gert.</h2><p>Síðan sem er komin í loftið.</p>',
  '<h2 id="work-title">Sjáðu hvað við höfum gert.</h2><p>Síðan sem er á lofti.</p>',
  '<h2 id="work-title">Verk eftir WOBO.</h2>',
];
const HEAD_HTML_TO = '<h2 id="work-title">Traustir samstarfsaðilar.</h2>';

function walk(dir, pred) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "public", "content"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, pred));
    else if (pred(e.name)) out.push(full);
  }
  return out;
}

function once(hay, from, to) {
  if (hay.includes(to) && !hay.includes(from)) return hay;
  if (!hay.includes(from)) return hay;
  return hay.split(from).join(to);
}

const dir = path.join(root, "assets");
const jsName = fs.readdirSync(dir).find((f) => /^index-.*\.js$/.test(f));
if (!jsName) throw new Error("copyfix: fann ekki index bundle");
const jsPath = path.join(dir, jsName);
let js = fs.readFileSync(jsPath, "utf8");
const jsBefore = js;
if (js.split(ARROW_JS_FROM).length !== 2 && !js.includes(ARROW_JS_TO)) {
  throw new Error("copyfix: fann ekki ↗-hnappinn í bundle einu sinni");
}
if (!HEAD_JS_FROM.some((from) => js.includes(from)) && !js.includes(HEAD_JS_TO)) {
  throw new Error("copyfix: fann ekki verkefnisfyrirsögn í bundle");
}
js = once(js, ARROW_JS_FROM, ARROW_JS_TO);
for (const from of HEAD_JS_FROM) js = once(js, from, HEAD_JS_TO);
if (!js.includes(MARK)) {
  js = js.includes("/*WOBO_BLOG_START*/")
    ? js.replace("/*WOBO_BLOG_START*/", MARK + "/*WOBO_BLOG_START*/")
    : js + "\n" + MARK;
}
if (js !== jsBefore) {
  fs.writeFileSync(jsPath, js);
  console.log("Copyfix: bundle uppfært.");
} else {
  console.log("Copyfix: bundle þegar rétt.");
}

let htmlN = 0;
for (const file of walk(root, (n) => n.endsWith(".html"))) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = once(html, ARROW_HTML_FROM, ARROW_HTML_TO);
  for (const from of HEAD_HTML_FROM) html = once(html, from, HEAD_HTML_TO);
  if (html !== before) {
    fs.writeFileSync(file, html);
    htmlN++;
  }
}
console.log(`Copyfix: ${htmlN} HTML-skrár uppfærðar.`);

if (js.includes("↗") || walk(root, (n) => n.endsWith(".html")).some((f) => {
  const t = fs.readFileSync(f, "utf8");
  return stale(t);
})) {
  // leftover check below
}
function stale(t) {
  return t.includes("↗") || t.includes("Sjáðu hvað við höfum gert.") || t.includes("Verk eftir WOBO.") || t.includes("Síðan sem er komin í loftið.") || t.includes("Síðan sem er á lofti.");
}
const leftover = [];
if (stale(fs.readFileSync(jsPath, "utf8"))) leftover.push("bundle");
for (const file of walk(root, (n) => n.endsWith(".html"))) {
  if (stale(fs.readFileSync(file, "utf8"))) leftover.push(path.relative(root, file));
}
if (leftover.length) throw new Error("copyfix: eftir stóð: " + leftover.join(", "));
