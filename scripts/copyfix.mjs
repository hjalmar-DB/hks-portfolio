/**
 * Copy fixes, idempotent. Run before scripts/build.mjs:
 *   - drops the ↗ on "Heimsækja vefsíðuna" (it shows as a cheap emoji on iPhone)
 *   - home portfolio heading becomes "Verk eftir WOBO."
 *   - removes the subline "Síðan sem er komin í loftið." (and the older "á lofti" wording)
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

const HEAD_JS_FROM =
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Sjáðu hvað við höfum gert.`}),(0,A.jsx)(`p`,{children:`Síðan sem er komin í loftið.`})";
const HEAD_JS_FROM_OLD =
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Sjáðu hvað við höfum gert.`}),(0,A.jsx)(`p`,{children:`Síðan sem er á lofti.`})";
const HEAD_JS_TO =
  "(0,A.jsx)(`h2`,{id:`work-title`,children:`Verk eftir WOBO.`})";

const HEAD_HTML_FROM =
  '<h2 id="work-title">Sjáðu hvað við höfum gert.</h2><p>Síðan sem er komin í loftið.</p>';
const HEAD_HTML_FROM_OLD =
  '<h2 id="work-title">Sjáðu hvað við höfum gert.</h2><p>Síðan sem er á lofti.</p>';
const HEAD_HTML_TO = '<h2 id="work-title">Verk eftir WOBO.</h2>';

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
if (js.includes(MARK)) {
  console.log("Copyfix: þegar komið í bundle.");
} else {
  if (js.split(ARROW_JS_FROM).length !== 2 && !js.includes(ARROW_JS_TO)) {
    throw new Error("copyfix: fann ekki ↗-hnappinn í bundle einu sinni");
  }
  if (
    js.split(HEAD_JS_FROM).length !== 2 &&
    js.split(HEAD_JS_FROM_OLD).length !== 2 &&
    !js.includes(HEAD_JS_TO)
  ) {
    throw new Error("copyfix: fann ekki verkefnisfyrirsögn í bundle");
  }
  js = once(js, ARROW_JS_FROM, ARROW_JS_TO);
  js = once(js, HEAD_JS_FROM, HEAD_JS_TO);
  js = once(js, HEAD_JS_FROM_OLD, HEAD_JS_TO);
  js = js.replace("/*WOBO_BLOG_START*/", MARK + "/*WOBO_BLOG_START*/");
  if (!js.includes(MARK)) js += "\n" + MARK;
  fs.writeFileSync(jsPath, js);
  console.log("Copyfix: bundle uppfært.");
}

let htmlN = 0;
for (const file of walk(root, (n) => n.endsWith(".html"))) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = once(html, ARROW_HTML_FROM, ARROW_HTML_TO);
  html = once(html, HEAD_HTML_FROM, HEAD_HTML_TO);
  html = once(html, HEAD_HTML_FROM_OLD, HEAD_HTML_TO);
  if (html !== before) {
    fs.writeFileSync(file, html);
    htmlN++;
  }
}
console.log(`Copyfix: ${htmlN} HTML-skrár uppfærðar.`);

if (js.includes("↗") || walk(root, (n) => n.endsWith(".html")).some((f) => {
  const t = fs.readFileSync(f, "utf8");
  return t.includes("↗") || t.includes("Sjáðu hvað við höfum gert.") || t.includes("Síðan sem er komin í loftið.");
})) {
  // leftover ↗ in JS comments? check more carefully below
}
const leftover = [];
if (fs.readFileSync(jsPath, "utf8").includes("↗")) leftover.push("bundle ↗");
if (fs.readFileSync(jsPath, "utf8").includes("Sjáðu hvað við höfum gert.")) leftover.push("bundle heading");
if (fs.readFileSync(jsPath, "utf8").includes("Síðan sem er komin í loftið.") || fs.readFileSync(jsPath, "utf8").includes("Síðan sem er á lofti.")) leftover.push("bundle subline");
for (const file of walk(root, (n) => n.endsWith(".html"))) {
  const t = fs.readFileSync(file, "utf8");
  if (t.includes("↗")) leftover.push(path.relative(root, file) + " ↗");
  if (t.includes("Sjáðu hvað við höfum gert.")) leftover.push(path.relative(root, file) + " heading");
  if (t.includes("Síðan sem er komin í loftið.") || t.includes("Síðan sem er á lofti.")) leftover.push(path.relative(root, file) + " subline");
}
if (leftover.length) throw new Error("copyfix: eftir stóð: " + leftover.join(", "));
