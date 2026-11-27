/**
 * Spam protection for the inquiry form, on top of the two honeypot fields.
 * A submit only goes to FormSubmit after a person has interacted with the form
 * (focus or key press) and at least 3 seconds have passed since then. Bots that
 * post straight away get the normal "Sendingin tókst ekki" message, never a
 * confirmation. Idempotent. Run before scripts/build.mjs.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "assets");
const file = fs.readdirSync(dir).find((f) => /^index-.*\.js$/.test(f));
const p = path.join(dir, file);
let js = fs.readFileSync(p, "utf8");
const MARK = "/*WOBO_FORM_GUARD*/";
if (js.includes(MARK)) {
  console.log("Forms: þegar komið.");
  process.exit(0);
}
const submitFrom = "let t=e.currentTarget,n=new FormData(t);if(String(n.get(`company_website`)";
const submitTo =
  "let t=e.currentTarget,n=new FormData(t);" + MARK +
  "if(!t.dataset.woboT0||Date.now()-Number(t.dataset.woboT0)<3e3){o(`failed`);return}" +
  "if(String(n.get(`company_website`)";
const propsFrom = "noValidate:!0,children:[(0,A.jsxs)(`div`,{className:`hp`";
const propsTo =
  "noValidate:!0,onFocusCapture:e=>{e.currentTarget.dataset.woboT0||(e.currentTarget.dataset.woboT0=String(Date.now()))}," +
  "onKeyDownCapture:e=>{e.currentTarget.dataset.woboT0||(e.currentTarget.dataset.woboT0=String(Date.now()))}," +
  "children:[(0,A.jsxs)(`div`,{className:`hp`";
for (const [from, label] of [[submitFrom, "submit"], [propsFrom, "props"]]) {
  if (js.split(from).length !== 2) throw new Error(`Forms: fann ekki ${label} einu sinni`);
}
js = js.replace(submitFrom, submitTo).replace(propsFrom, propsTo);
fs.writeFileSync(p, js);
console.log("Forms: tíma- og snertivörn sett á fyrirspurnarformið.");
