/**
 * Keeps the prerendered HTML in step with React hydration (fixes React error #418).
 *
 * The prerendered pages were saved from the live DOM, so adjacent text pieces
 * (for example `Letur: ` + `Montserrat`) were merged into one text node and the
 * `<!-- -->` separators React expects were lost. React then fails hydration.
 *
 *   node scripts/hydration.mjs strip   removes the separators (run first, so the
 *                                       patch scripts see plain text)
 *   node scripts/hydration.mjs add     renders every page in headless Chrome and
 *                                       puts the separators back where React splits text
 *
 * `add` needs `playwright-core` (npm i -D playwright-core) and Chrome. Set CHROME_PATH
 * if Chrome is not at /usr/bin/google-chrome. If either is missing, `add` stops with a
 * warning and leaves the files alone. Only `<!-- -->` comments are ever inserted.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const MARK = "<!-- -->";
const mode = process.argv[2];

function htmlFiles(dir = root) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "content", ".git", "scripts", "public"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(full));
    else if (e.name === "index.html") out.push(full);
  }
  return out;
}

function rootBounds(html) {
  const open = '<div id="root">';
  const s = html.indexOf(open);
  const body = html.indexOf("</body>");
  if (s === -1 || body === -1) return null;
  return { a: s + open.length, b: html.lastIndexOf("</div>", body) };
}

if (mode === "strip") {
  let n = 0;
  for (const f of htmlFiles()) {
    const html = fs.readFileSync(f, "utf8");
    const r = rootBounds(html);
    if (!r) continue;
    const inner = html.slice(r.a, r.b);
    if (!inner.includes(MARK)) continue;
    fs.writeFileSync(f, html.slice(0, r.a) + inner.split(MARK).join("") + html.slice(r.b));
    n++;
  }
  console.log(`Hydration: fjarlægði skil úr ${n} síðum.`);
} else if (mode === "add") {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    console.warn("Hydration: playwright-core vantar. Skil ekki sett inn (npm i -D playwright-core).");
    process.exit(0);
  }
  const exe = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  if (!fs.existsSync(exe)) {
    console.warn(`Hydration: Chrome fannst ekki (${exe}). Skil ekki sett inn.`);
    process.exit(0);
  }
  const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json", ".html": "text/html" };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  let failed = false;
  for (const file of htmlFiles()) {
    const route = "/" + path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean).join("/") + "/";
    const route2 = route === "//" ? "/" : route;
    const html = fs.readFileSync(file, "utf8");
    const r = rootBounds(html);
    if (!r) continue;
    const inner = html.slice(r.a, r.b);
    if (!inner.trim() || inner.includes(MARK)) continue;
    const page = await browser.newPage();
    await page.route("**/*", (rt) =>
      rt.request().resourceType() === "document"
        ? rt.fulfill({ body: html.slice(0, r.a) + html.slice(r.b), contentType: "text/html" })
        : rt.continue(),
    );
    await page.goto(base + route2, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const res = await page.evaluate((inner) => {
      const tpl = document.createElement("template");
      tpl.innerHTML = inner;
      const problems = [];
      let fixed = 0;
      const kids = (n) => [...n.childNodes].filter((c) => c.nodeType !== 8);
      function walk(a, c) {
        const ak = kids(a), ck = kids(c);
        let i = 0, j = 0;
        while (j < ck.length) {
          if (ck[j].nodeType === 3) {
            const group = [];
            while (j < ck.length && ck[j].nodeType === 3) group.push(ck[j++].data);
            const parts = group.filter((x) => x !== "");
            const an = ak[i];
            if (an && an.nodeType === 3) {
              if (an.data !== group.join("")) problems.push(`texti: ${JSON.stringify(an.data.slice(0, 60))}`);
              else if (parts.length > 1) {
                const frag = document.createDocumentFragment();
                parts.forEach((t, k) => {
                  if (k) frag.appendChild(document.createComment(" "));
                  frag.appendChild(document.createTextNode(t));
                });
                an.replaceWith(frag);
                fixed++;
              }
              i++;
            } else if (group.join("") !== "") problems.push(`vantar texta: ${JSON.stringify(group.join("").slice(0, 60))}`);
          } else {
            const cn = ck[j], an = ak[i];
            if (!an || an.nodeType !== 1 || an.tagName !== cn.tagName) {
              problems.push(`uppbygging: ${cn.tagName}`);
              return;
            }
            if (cn.namespaceURI !== "http://www.w3.org/2000/svg") walk(an, cn);
            i++;
            j++;
          }
        }
      }
      walk(tpl.content, document.getElementById("root"));
      const d = document.createElement("div");
      d.appendChild(tpl.content.cloneNode(true));
      return { fixed, problems, out: d.innerHTML };
    }, inner);
    await page.close();
    if (res.problems.length) {
      failed = true;
      console.warn(`Hydration: ${route2} passar ekki við React: ${res.problems.slice(0, 3).join("; ")}`);
      continue;
    }
    if (res.out.split(MARK).join("") !== inner) {
      failed = true;
      console.warn(`Hydration: ${route2} breyttist umfram skil. Skrá ekki skrifuð.`);
      continue;
    }
    if (res.fixed) {
      fs.writeFileSync(file, html.slice(0, r.a) + res.out + html.slice(r.b));
      console.log(`Hydration: ${route2} ${res.fixed} skil.`);
    }
  }
  await browser.close();
  server.close();
  if (failed) process.exit(1);
} else {
  console.error("Notkun: node scripts/hydration.mjs strip|add");
  process.exit(2);
}
