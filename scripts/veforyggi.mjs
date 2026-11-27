/**
 * Adds the "Veföryggi og rekstur" page (/veforyggi/) and the links to it.
 * Patches the published bundle and the prerendered HTML so they stay in step.
 * Idempotent. Run it before scripts/build.mjs (build.mjs renames the bundle by hash):
 *   node scripts/veforyggi.mjs && node scripts/build.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SITE = "https://wobo.is";
const PATHNAME = "/veforyggi/";

const PAGE = {
  title: "Veföryggi og rekstur | Wobo",
  description:
    "Veföryggi, fyrirtækjapóstur, vöktun og afrit fyrir vefi. Hluti af umsjón hjá Wobo. Öryggisyfirferð líka fyrir vefi sem Wobo smíðaði ekki. Verð eftir umfangi.",
  h1: "Veföryggi og rekstur",
  lede: "Vefur þarf meira en útlit. Hann þarf að vera læstur, undir eftirliti og með afrit sem virka. Hér er það sem við setjum upp og hvað fylgir umsjón.",
  serviceName: "Veföryggi og rekstur",
  sections: [
    {
      id: "veforyggi",
      title: "Veföryggi",
      paragraphs: [
        "Á hverri nýrri síðu sem við smíðum setjum við upp Cloudflare. Þar er eldveggur (WAF), vörn gegn vélmennum og vörn gegn álagsárásum (DDoS).",
        "Síðan er alltaf á HTTPS. Við stillum líka öryggishausa, sem segja vafranum hvernig síðan má nota. Til dæmis að hún megi ekki opnast inni í annarri síðu.",
        "Þetta er hluti af mánaðarlegri umsjón. Það er ekki trygging fyrir því að ekkert komi fyrir, en það lokar á algengar leiðir og minnkar áhættuna.",
      ],
    },
    {
      id: "postur",
      title: "Fyrirtækjapóstur",
      paragraphs: [
        "Netfang á léni fyrirtækisins, eins og nafn@fyrirtaeki.is, er það sem viðskiptavinir búast við að sjá.",
        "Við setjum póstinn upp rétt. Það þýðir SPF, DKIM og DMARC. Þær stillingar segja móttakandanum að pósturinn komi í raun frá ykkur, og gera erfiðara að villa á sér heimildir í ykkar nafni. Við kveikjum líka á tveggja þátta auðkenningu við innskráningu.",
        "Uppsetningin er einskiptisverk. Viðhaldið er hluti af umsjón. Verð eftir umfangi.",
      ],
    },
    {
      id: "voktun",
      title: "Vöktun og afrit",
      paragraphs: [
        "Við fylgjumst með síðunni og fáum tilkynningu ef hún fer niður. Þá byrjum við að skoða hvað gerðist. Við erum ekki á vakt alla nóttina og lofum ekki ákveðnum viðbragðstíma.",
        "Við tökum afrit af síðunni og gögnum hennar. Afrit sem enginn hefur prófað er óvissa, ekki öryggi. Þess vegna prófum við að endurheimta úr afritunum.",
        "Hversu oft afrit eru tekin og hve lengi þau eru geymd fer eftir síðunni og stendur í tilboðinu.",
      ],
    },
    {
      id: "yfirferd",
      title: "Öryggisyfirferð",
      paragraphs: [
        "Öryggisyfirferð er skoðun á vef sem er þegar kominn í loftið. Hún er einskiptis eða árleg, og hún er líka fyrir vefi sem Wobo smíðaði ekki.",
        "Við förum yfir HTTPS og skírteini, öryggishausa, eyðublöð og öryggi pósts á léninu, það er SPF, DKIM og DMARC.",
        "Þú færð skriflegan lista yfir það sem er í lagi og það sem þarf að laga. Við breytum engu á vefnum nema þú biðjir um það. Verð eftir umfangi.",
      ],
    },
    {
      id: "umsjon",
      title: "Hvað er í umsjón",
      paragraphs: [
        "Mánaðarleg umsjón er hýsing, uppfærslur og smáar breytingar. Veföryggi, vöktun og afrit eru líka hluti af henni, og viðhald á fyrirtækjapósti.",
        "Verð á umsjón stendur á verðsíðunni. Hvað fylgir hverju stigi umsjónar stendur í tilboðinu. Fyrirtækjapóstur og öryggisyfirferð eru verð eftir umfangi. Þú getur beðið um tilboð hér fyrir neðan.",
      ],
    },
  ],
  links: [
    { href: "/verd/", label: "Verðskrá" },
    { href: "/vefsidugerd/", label: "Vefsíðugerð" },
    { href: "/vefverslun/", label: "Vefverslun" },
  ],
};

const read = (f) => fs.readFileSync(f, "utf8");
const write = (f, t) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
};

function mustReplace(hay, from, to, label) {
  if (hay.includes(to)) return hay;
  if (!hay.includes(from)) throw new Error(`Fann ekki streng: ${label}`);
  return hay.split(from).join(to);
}

function walkHtml(dir = root) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "content", ".git"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkHtml(full));
    else if (e.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const tpl = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

/** Index of the "]" that closes the array opening at `open`. Skips template strings. */
function matchBracket(js, open) {
  let depth = 0;
  for (let i = open; i < js.length; i++) {
    const c = js[i];
    if (c === "`") {
      i++;
      while (js[i] !== "`") {
        if (js[i] === "\\") i++;
        i++;
      }
    } else if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Fann ekki enda á lista");
}

function pageEntryJs() {
  const sections = PAGE.sections
    .map(
      (s) =>
        `{id:\`${s.id}\`,title:\`${tpl(s.title)}\`,paragraphs:[${s.paragraphs.map((p) => `\`${tpl(p)}\``).join(",")}]}`,
    )
    .join(",");
  const links = PAGE.links.map((l) => `{href:\`${l.href}\`,label:\`${tpl(l.label)}\`}`).join(",");
  return `{path:\`${PATHNAME}\`,title:\`${tpl(PAGE.title)}\`,description:\`${tpl(PAGE.description)}\`,h1:\`${tpl(PAGE.h1)}\`,lede:\`${tpl(PAGE.lede)}\`,serviceName:\`${tpl(PAGE.serviceName)}\`,offers:[],sections:[${sections}],links:[${links}]}`;
}

function patchBundle(js) {
  // 1. The page itself, appended to the list of content pages.
  if (!js.includes(`{path:\`${PATHNAME}\``)) {
    const at = js.indexOf("Ar=[{path:`/vefsidugerd/`");
    if (at === -1) throw new Error("Fann ekki síðulistann (Ar)");
    const open = js.indexOf("[", at);
    const close = matchBracket(js, open);
    js = js.slice(0, close) + "," + pageEntryJs() + js.slice(close);
  }

  // 2. Footer link.
  js = mustReplace(
    js,
    "{href:`/thjonusta/crm/`,label:`CRM-kerfi`},{href:`/verd/`,label:`Verð`}",
    "{href:`/thjonusta/crm/`,label:`CRM-kerfi`},{href:`/veforyggi/`,label:`Veföryggi og rekstur`},{href:`/verd/`,label:`Verð`}",
    "footer links",
  );

  // 3. Home: the Umsjón step.
  js = mustReplace(
    js,
    "Eftir það: hýsing, uppfærslur og smáar breytingar, ef þið viljið.",
    "Eftir það: hýsing, uppfærslur, veföryggi, vöktun og smáar breytingar, ef þið viljið.",
    "home process step",
  );

  // 4. /verd/: spell out what umsjón includes, with a link.
  js = mustReplace(
    js,
    "children:Lr.map(e=>(0,A.jsx)(Gr,{item:e,monthly:!0},e.id))})]})",
    "children:Lr.map(e=>(0,A.jsx)(Gr,{item:e,monthly:!0},e.id))}),(0,A.jsxs)(`p`,{children:[`Veföryggi, vöktun og afrit eru hluti af umsjón. Hvað fylgir hverju stigi stendur í tilboðinu. `,(0,A.jsx)(Dn,{className:`text-link`,to:`/veforyggi/`,children:`Sjá veföryggi og rekstur`})]})]})",
    "verd care section",
  );

  // 5. /vefsidugerd/: the monthly fee sentence and a link to the new page.
  js = mustReplace(
    js,
    "Mánaðargjaldið er fyrir hýsingu, uppfærslur og smáar breytingar. Það er ekki ný síða í hverjum mánuði.",
    "Mánaðargjaldið er fyrir hýsingu, uppfærslur, veföryggi, vöktun og smáar breytingar. Það er ekki ný síða í hverjum mánuði.",
    "vefsidugerd monthly fee",
  );
  js = mustReplace(
    js,
    "links:[{href:`/vefverslun/`,label:`Vefverslun`},{href:`/vefsidugerd-reykjavik/`,label:`Vefsíðugerð í Reykjavík`},{href:`/bokunarkerfi-og-crm/`,label:`Bókunarkerfi`},{href:`/verd/`,label:`Verðskrá`},{href:`/verkefni/draumabilar/`,label:`Draumabílar`}]},{path:`/vefverslun/`",
    "links:[{href:`/vefverslun/`,label:`Vefverslun`},{href:`/vefsidugerd-reykjavik/`,label:`Vefsíðugerð í Reykjavík`},{href:`/bokunarkerfi-og-crm/`,label:`Bókunarkerfi`},{href:`/veforyggi/`,label:`Veföryggi og rekstur`},{href:`/verd/`,label:`Verðskrá`},{href:`/verkefni/draumabilar/`,label:`Draumabílar`}]},{path:`/vefverslun/`",
    "vefsidugerd links",
  );
  return js;
}

function patchFooterHtml(html) {
  const from = '<li><a href="/verd/" data-discover="true">Verð</a></li>';
  const to = `<li><a href="/veforyggi/" data-discover="true">Veföryggi og rekstur</a></li>${from}`;
  if (html.includes('href="/veforyggi/" data-discover="true">Veföryggi og rekstur</a></li>')) return html;
  if (!html.includes(from)) return html;
  return html.split(from).join(to);
}

function patchPages() {
  // Footer link on every page.
  for (const file of walkHtml()) {
    const html = read(file);
    const next = patchFooterHtml(html);
    if (next !== html) write(file, next);
  }

  // Home.
  const home = path.join(root, "index.html");
  let h = read(home);
  h = mustReplace(
    h,
    "Eftir það: hýsing, uppfærslur og smáar breytingar, ef þið viljið.",
    "Eftir það: hýsing, uppfærslur, veföryggi, vöktun og smáar breytingar, ef þið viljið.",
    "home process html",
  );
  write(home, h);

  // /verd/.
  const verd = path.join(root, "verd", "index.html");
  let v = read(verd);
  v = mustReplace(
    v,
    '<p class="price-vat">37.076 kr. með vsk á mánuði</p><ul><li>Hýsing</li><li>Uppfærslur</li><li>Fleiri smábreytingar</li></ul></article></div></section>',
    '<p class="price-vat">37.076 kr. með vsk á mánuði</p><ul><li>Hýsing</li><li>Uppfærslur</li><li>Fleiri smábreytingar</li></ul></article></div><p>Veföryggi, vöktun og afrit eru hluti af umsjón. Hvað fylgir hverju stigi stendur í tilboðinu. <a class="text-link" href="/veforyggi/" data-discover="true">Sjá veföryggi og rekstur</a></p></section>',
    "verd html",
  );
  write(verd, v);

  // /vefsidugerd/.
  const vef = path.join(root, "vefsidugerd", "index.html");
  let w = read(vef);
  w = mustReplace(
    w,
    "Mánaðargjaldið er fyrir hýsingu, uppfærslur og smáar breytingar. Það er ekki ný síða í hverjum mánuði.",
    "Mánaðargjaldið er fyrir hýsingu, uppfærslur, veföryggi, vöktun og smáar breytingar. Það er ekki ný síða í hverjum mánuði.",
    "vefsidugerd html fee",
  );
  w = mustReplace(
    w,
    '<li><a href="/bokunarkerfi-og-crm/" data-discover="true">Bókunarkerfi</a></li><li><a href="/verd/" data-discover="true">Verðskrá</a></li><li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li></ul></nav>',
    '<li><a href="/bokunarkerfi-og-crm/" data-discover="true">Bókunarkerfi</a></li><li><a href="/veforyggi/" data-discover="true">Veföryggi og rekstur</a></li><li><a href="/verd/" data-discover="true">Verðskrá</a></li><li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li></ul></nav>',
    "vefsidugerd html related",
  );
  write(vef, w);
}

function pageMainHtml(shellMain) {
  const url = SITE + PATHNAME;
  const sections = PAGE.sections
    .map(
      (s) =>
        `<section aria-labelledby="${s.id}"><h2 id="${s.id}">${esc(s.title)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</section>`,
    )
    .join("");
  const related = `<nav class="related" aria-label="Tengdar síður"><h2>Áfram</h2><ul>${PAGE.links.map((l) => `<li><a href="${l.href}" data-discover="true">${esc(l.label)}</a></li>`).join("")}</ul></nav>`;
  const faqAt = shellMain.indexOf('<section class="faq"');
  if (faqAt === -1) throw new Error("Fann ekki FAQ í skel");
  const tail = shellMain.slice(faqAt);
  return `<main id="efni" tabindex="-1"><article class="band page-copy"><nav class="crumbs" aria-label="Brauðmolaslóð"><ol><li><a href="/" data-discover="true">Forsíða</a></li><li><span aria-current="page">${esc(PAGE.h1)}</span></li></ol></nav><h1>${esc(PAGE.h1)}</h1><p class="lede">${esc(PAGE.lede)}</p>${sections}${related}${tail}`;
  void url;
}

function writePage() {
  const shellFile = path.join(root, "vefsidugerd", "index.html");
  let html = read(shellFile);
  const url = SITE + PATHNAME;
  const oldTitle = html.match(/<title>([^<]*)<\/title>/)[1];
  const oldDesc = html.match(/<meta name="description" content="([^"]*)">/)[1];
  const set = (re, val) => {
    if (!re.test(html)) throw new Error(`Fann ekki: ${re}`);
    html = html.replace(re, val);
  };
  set(/<title>[^<]*<\/title>/, `<title>${esc(PAGE.title)}</title>`);
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(PAGE.description)}">`);
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(PAGE.title)}">`);
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(PAGE.description)}">`);
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  set(/<link rel="alternate" hreflang="is" href="[^"]*">/, `<link rel="alternate" hreflang="is" href="${url}">`);
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(PAGE.title)}">`);
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(PAGE.description)}">`);
  void oldTitle;
  void oldDesc;

  // JSON-LD: same graph as the other content pages, with this page's own entries.
  const ld = JSON.parse(html.match(/<script id="jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  for (const node of ld["@graph"]) {
    if (node["@type"] === "WebPage") {
      node.name = PAGE.title;
      node.url = url;
      node.description = PAGE.description;
    }
    if (node["@type"] === "BreadcrumbList") {
      node.itemListElement[1].name = PAGE.h1;
      node.itemListElement[1].item = url;
    }
    if (node["@type"] === "Service") {
      node.name = PAGE.serviceName;
      node.url = url;
      delete node.offers;
    }
  }
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  html = html.replace(
    /<script id="jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    () => `<script id="jsonld" type="application/ld+json">${json}</script>`,
  );

  const shellMain = html.match(/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/)[0];
  html = html.replace(shellMain, () => pageMainHtml(shellMain));
  write(path.join(root, "veforyggi", "index.html"), html);
}

function patchSitemap() {
  const file = path.join(root, "sitemap.xml");
  let s = read(file);
  if (s.includes(`${SITE}${PATHNAME}`)) return;
  const line = `  <url><loc>${SITE}${PATHNAME}</loc><lastmod>2026-11-27</lastmod></url>\n`;
  const anchor = `  <url><loc>${SITE}/vefsidugerd/</loc>`;
  if (s.includes(anchor)) s = s.replace(anchor, `${line}${anchor}`);
  else s = s.replace("</urlset>", `${line}</urlset>`);
  write(file, s);
}

function main() {
  const idx = read(path.join(root, "index.html"));
  const jsName = idx.match(/\/assets\/(index-[^"']+\.js)/)[1];
  const jsPath = path.join(root, "assets", jsName);
  const js = read(jsPath);
  const next = patchBundle(js);
  if (next !== js) write(jsPath, next);
  patchPages();
  writePage();
  // The footer link also has to be on the new page itself.
  const np = path.join(root, "veforyggi", "index.html");
  write(np, patchFooterHtml(read(np)));
  patchSitemap();
  console.log(`Veföryggi: ${PATHNAME} skrifuð. Bundle: /assets/${jsName}`);
}

main();
