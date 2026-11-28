/**
 * Adds the Kjarnaverk project (kjarnaverk.is) to the portfolio:
 * data in the bundle, the work card on the home page, /verkefni/kjarnaverk/,
 * footer link, JSON-LD, sitemap and the copy that said Draumabílar was the only project.
 * Idempotent. Run after scripts/veforyggi.mjs and before scripts/build.mjs:
 *   node scripts/veforyggi.mjs && node scripts/kjarnaverk.mjs && node scripts/build.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SITE = "https://wobo.is";
const ID = "kjarnaverk";
const URL_PATH = `/verkefni/${ID}/`;

const IMG = {
  logo: "/assets/logo-EMovAiZV.svg",
  hero: { src: "/assets/hero-2BSGACTj.webp", width: 1400, height: 875 },
  services: { src: "/assets/services-3sYGQDQB.webp", width: 1400, height: 875 },
  mobile: { src: "/assets/mobile-LpRGUheS.webp", width: 390, height: 844 },
};

const P = {
  name: "Kjarnaverk",
  domain: "kjarnaverk.is",
  url: "https://kjarnaverk.is",
  category: "Vefsíðuhönnun · Vefþróun",
  summary: "Vefsíða fyrir Kjarnaverk ehf., byggingarverktaka. Þjónusta, verk og beiðni um tilboð.",
  intro:
    "Vefsíða fyrir Kjarnaverk ehf., byggingarverktaka sem tekur að sér stærri og minni verkefni.",
  goal: "Þjónustan, verkin og beiðni um tilboð á einni síðu.",
  need: "Kjarnaverk ehf. er byggingarverktaki sem tekur að sér stærri og minni verkefni, til dæmis húsbyggingar, byggingarstjórn, epoxýgólf, þakviðgerðir og vinnubúðir.",
  did: "Á kjarnaverk.is eru þjónustusíða, verkasíða með myndum, síða um fyrirtækið og beiðni um tilboð.",
  now: "Þjónustan er á einni síðu og verkin í myndasafni. Hægt er að hringja beint eða senda beiðni um tilboð. Engar tölur um verk eða viðskiptavini eru birtar hér.",
  colors: ["#16163a", "#25255f", "#F1592A", "#F6F3EC"],
  fonts: ["Montserrat", "Schibsted Grotesk"],
  integrations: [
    {
      key: "Kjarnaverk services",
      category: "Services",
      en: "A services page lists site management, construction management, epoxy floors, roof repairs, windows and doors, custom-built houses, site huts, foundations, steel-frame buildings and building materials.",
      title: "Þjónusta",
      description:
        "Síða með lista yfir verkstjórn, byggingarstjórn, epoxýgólf, þakviðgerðir, glugga og hurðir, sérsmíðuð hús, vinnubúðir, dregara og undirstöður, stálgrindarhús og byggingarvörur.",
    },
    {
      key: "Kjarnaverk gallery",
      category: "Projects",
      en: "A projects page shows photos of jobs in categories.",
      title: "Verk",
      description:
        "Síða með myndum úr verkum, flokkuðum í hús, vinnubúðir, þök, gólf, undirstöður, framkvæmdir og teikningar.",
    },
    {
      key: "Kjarnaverk quote request",
      category: "Quote",
      en: "A multi-step quote request. Sending opens the visitor's email app with the request filled in.",
      title: "Beiðni um tilboð",
      description:
        "Eyðublað í sex skrefum, meðal annars tegund verks, umfang, staðsetning og tengiliður. Þegar það er sent opnast tölvupóstforrit notandans með beiðninni. Myndir eru hengdar við þar.",
    },
    {
      key: "Kjarnaverk about",
      category: "Contact",
      en: "An about page and a questions-and-answers section.",
      title: "Um fyrirtækið",
      description:
        "Síða um það sem fyrirtækið sérhæfir sig í, með spurningum og svörum um verkin.",
    },
  ],
};

const read = (f) => fs.readFileSync(f, "utf8");
const write = (f, t) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
};
function mustReplace(hay, from, to, label, done) {
  if (hay.includes(to)) return hay;
  const markers = done == null ? [] : Array.isArray(done) ? done : [done];
  if (markers.some((s) => hay.includes(s))) return hay;
  if (!hay.includes(from)) throw new Error(`Fann ekki streng: ${label}`);
  return hay.split(from).join(to);
}
const t = (s) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
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

const COPY = {
  vefDaemiTitleFrom: "Verkefnið sem er á lofti",
  vefDaemiTitleTo: "Verkefnin sem eru á lofti",
  vefDaemiFrom:
    "Eina verkefnið sem er opið hér er Draumabílar. Það er vefsíða fyrir bílasölu á Fosshálsi 1 í Reykjavík, með leit að bílum og reikni fyrir afborgun. Við birtum ekki sölutölur og bætum ekki við nöfnum sem eru ekki sýnd.",
  vefDaemiTo:
    "Tvö verkefni eru opin hér: Draumabílar og Kjarnaverk. Draumabílar er vefsíða fyrir bílasölu á Fosshálsi 1 í Reykjavík, með leit að bílum og reikni fyrir afborgun. Kjarnaverk er vefsíða fyrir byggingarverktaka, með þjónustu, verkum og beiðni um tilboð. Við birtum ekki sölutölur og bætum ekki við nöfnum sem eru ekki sýnd.",
  rvkTitleFrom: "Eitt verkefni í borginni",
  rvkTitleTo: "Verkefnin sem eru sýnd",
  rvkFrom:
    "Verkefnið sem er sýnt opinberlega er Draumabílar, bílasala á Fosshálsi 1, 110 Reykjavík. Á síðunni er leit að bílum og reiknir fyrir afborgun. Þetta er eitt verkefni. Við bætum ekki við nöfnum sem eru ekki á lofti hér og birtum ekki umsagnir viðskiptavina.",
  rvkTo:
    "Verkefnin sem eru sýnd opinberlega eru Draumabílar, bílasala á Fosshálsi 1, 110 Reykjavík, og Kjarnaverk, vefsíða byggingarverktaka. Á síðu Draumabíla er leit að bílum og reiknir fyrir afborgun. Á síðu Kjarnaverks er þjónusta, verk og beiðni um tilboð. Við bætum ekki við nöfnum sem eru ekki á lofti hér og birtum ekki umsagnir viðskiptavina.",
};

function patchBundle(js) {
  const siteObj = `{id:${t(ID)},name:${t(P.name)},domain:${t(P.domain)},url:${t(P.url)},status:\`live\`,category:\`Construction\`,description:\`General building contractor. Houses, site and construction management, epoxy floors, roof repairs, windows and doors, site huts.\`,keywords:[\`construction\`,\`contractor\`,\`building\`,\`kjarnaverk\`],palette:[\`#F1592A\`,\`#25255f\`,\`#16163a\`],colors:[${P.colors.map(t).join(",")}],fonts:[${P.fonts.map(t).join(",")}],stack:[\`Custom HTML, CSS, and JavaScript\`,\`Cloudflare\`],integrations:[${P.integrations.map((i) => `{title:${t(i.key)},category:${t(i.category)},description:${t(i.en)}}`).join(",")}]}`;
  js = mustReplace(js, "},{id:`younes`,name:`Younes`", `},${siteObj},{id:\`younes\`,name:\`Younes\``, "sites");

  js = mustReplace(
    js,
    "or=[`jarnverk`,`draumabilar`,`dreamcars`,`s9`,`younes`]",
    "or=[`jarnverk`,`draumabilar`,`kjarnaverk`,`dreamcars`,`s9`,`younes`]",
    "visible list",
  );

  const crObj = `${ID}:{category:${t(P.category)},summary:${t(P.summary)},intro:${t(P.intro)},goal:${t(P.goal)},builtLead:\`Þetta er á síðunni.\`,case:{need:${t(P.need)},did:${t(P.did)},now:${t(P.now)}}}`;
  js = mustReplace(
    js,
    "},jarnverk:{category:`Vefsíðuhönnun · Vefþróun`,summary:`Vefsíða fyrir Járnverk.",
    `},${crObj},jarnverk:{category:\`Vefsíðuhönnun · Vefþróun\`,summary:\`Vefsíða fyrir Járnverk.`,
    "case data",
  );

  const shots = `${ID}:{logo:${t(IMG.logo)},shots:[{src:${t(IMG.hero.src)},label:\`Home\`,device:\`desktop\`,width:${IMG.hero.width},height:${IMG.hero.height}},{src:${t(IMG.services.src)},label:\`Services\`,device:\`desktop\`,width:${IMG.services.width},height:${IMG.services.height}},{src:${t(IMG.mobile.src)},label:\`Home\`,device:\`mobile\`,width:${IMG.mobile.width},height:${IMG.mobile.height}}]}`;
  js = mustReplace(js, "]},jarnverk:{logo:`/assets/logo-Cw7Hhn3I.svg`", `]},${shots},jarnverk:{logo:\`/assets/logo-Cw7Hhn3I.svg\``, "screenshots");

  const dr = P.integrations.map((i) => `${JSON.stringify(i.key)}:{title:${t(i.title)},description:${t(i.description)}}`).join(",");
  js = mustReplace(js, '"Service pages":{title:`Þjónustusíður`', `${dr},"Service pages":{title:\`Þjónustusíður\``, "integration text");

  // Copy that said Draumabílar was the only project.
  js = mustReplace(js, `id:\`daemi\`,title:\`${COPY.vefDaemiTitleFrom}\``, `id:\`daemi\`,title:\`${COPY.vefDaemiTitleTo}\``, "vefsidugerd title");
  js = mustReplace(js, COPY.vefDaemiFrom, COPY.vefDaemiTo, "vefsidugerd paragraph", "með leit, innflutningi og fjármögnunarreikni");
  js = mustReplace(js, `id:\`verk\`,title:\`${COPY.rvkTitleFrom}\``, `id:\`verk\`,title:\`${COPY.rvkTitleTo}\``, "reykjavik title");
  js = mustReplace(js, COPY.rvkFrom, COPY.rvkTo, "reykjavik paragraph", "leit að bílum, innflutningur og reiknir fyrir afborgun");

  // Related links on those two pages.
  js = mustReplace(
    js,
    "{href:`/verkefni/draumabilar/`,label:`Draumabílar`}]},{path:`/vefverslun/`",
    "{href:`/verkefni/draumabilar/`,label:`Draumabílar`},{href:`/verkefni/kjarnaverk/`,label:`Kjarnaverk`}]},{path:`/vefverslun/`",
    "vefsidugerd links",
  );
  js = mustReplace(
    js,
    "{href:`/verkefni/draumabilar/`,label:`Draumabílar`}]},{path:`/bokunarkerfi-og-crm/`",
    "{href:`/verkefni/draumabilar/`,label:`Draumabílar`},{href:`/verkefni/kjarnaverk/`,label:`Kjarnaverk`}]},{path:`/bokunarkerfi-og-crm/`",
    "reykjavik links",
  );
  return js;
}

const relatedFrom = '<li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li></ul></nav>';
const relatedTo = '<li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li><li><a href="/verkefni/kjarnaverk/" data-discover="true">Kjarnaverk</a></li></ul></nav>';

function patchPages() {
  // Footer list "Verkefni" on every page.
  const footFrom = '<p class="meta">Verkefni</p><ul><li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li></ul>';
  const footTo = '<p class="meta">Verkefni</p><ul><li><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></li><li><a href="/verkefni/kjarnaverk/" data-discover="true">Kjarnaverk</a></li></ul>';
  for (const file of walkHtml()) {
    const html = read(file);
    if (html.includes(footTo) || !html.includes(footFrom)) continue;
    write(file, html.split(footFrom).join(footTo));
  }

  // Home: work card and JSON-LD.
  const home = path.join(root, "index.html");
  let h = read(home);
  const card = `<li class="work-card"><a class="work-shot" href="${URL_PATH}" data-discover="true"><img width="${IMG.hero.width}" height="${IMG.hero.height}" alt="${escAttr(`Skjámynd af ${P.name}. ${P.summary}`)}" loading="lazy" decoding="async" src="${IMG.hero.src}"></a><div class="work-copy"><h3><a href="${URL_PATH}" data-discover="true">${P.name}</a></h3><p class="meta">${esc(P.category)}</p><p>${esc(P.summary)}</p><a class="text-link" href="${URL_PATH}" data-discover="true">Skoða verkefni</a></div></li>`;
  h = mustReplace(
    h,
    '<a class="text-link" href="/verkefni/draumabilar/" data-discover="true">Skoða verkefni</a></div></li></ol>',
    `<a class="text-link" href="/verkefni/draumabilar/" data-discover="true">Skoða verkefni</a></div></li>${card}</ol>`,
    "home card",
  );
  h = mustReplace(
    h,
    '"makesOffer":[{"@type":"CreativeWork","name":"Draumabílar","url":"https://wobo.is/verkefni/draumabilar/"}]',
    `"makesOffer":[{"@type":"CreativeWork","name":"Draumabílar","url":"https://wobo.is/verkefni/draumabilar/"},{"@type":"CreativeWork","name":"${P.name}","url":"${SITE}${URL_PATH}"}]`,
    "home json-ld",
  );
  write(home, h);

  // /vefsidugerd/ and /vefsidugerd-reykjavik/.
  const vef = path.join(root, "vefsidugerd", "index.html");
  let v = read(vef);
  v = mustReplace(v, `<h2 id="daemi">${COPY.vefDaemiTitleFrom}</h2>`, `<h2 id="daemi">${COPY.vefDaemiTitleTo}</h2>`, "vef html title");
  v = mustReplace(v, COPY.vefDaemiFrom, COPY.vefDaemiTo, "vef html text", "með leit, innflutningi og fjármögnunarreikni");
  v = mustReplace(v, relatedFrom, relatedTo, "vef html related");
  write(vef, v);

  const rvk = path.join(root, "vefsidugerd-reykjavik", "index.html");
  let r = read(rvk);
  r = mustReplace(r, `<h2 id="verk">${COPY.rvkTitleFrom}</h2>`, `<h2 id="verk">${COPY.rvkTitleTo}</h2>`, "rvk html title");
  r = mustReplace(r, COPY.rvkFrom, COPY.rvkTo, "rvk html text", "leit að bílum, innflutningur og reiknir fyrir afborgun");
  r = mustReplace(r, relatedFrom, relatedTo, "rvk html related");
  write(rvk, r);
}

function writeProjectPage() {
  const shell = read(path.join(root, "verkefni", "draumabilar", "index.html"));
  let html = shell;
  const title = `${P.name} | Verkefni – Wobo`;
  const url = `${SITE}${URL_PATH}`;
  const set = (re, val) => {
    if (!re.test(html)) throw new Error(`Fann ekki: ${re}`);
    html = html.replace(re, () => val);
  };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(P.summary)}">`);
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(title)}">`);
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(P.summary)}">`);
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  set(/<link rel="alternate" hreflang="is" href="[^"]*">/, `<link rel="alternate" hreflang="is" href="${url}">`);
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(title)}">`);
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(P.summary)}">`);

  const ld = JSON.parse(html.match(/<script id="jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  for (const node of ld["@graph"]) {
    if (node["@type"] === "WebPage") {
      node.name = title;
      node.url = url;
      node.description = P.summary;
    }
    if (node["@type"] === "BreadcrumbList") {
      node.itemListElement[2].name = P.name;
      node.itemListElement[2].item = url;
    }
  }
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  html = html.replace(/<script id="jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, () => `<script id="jsonld" type="application/ld+json">${json}</script>`);

  const feature = P.integrations.map((i) => `<li><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></li>`).join("");
  const fig = (s, label, name, loc) =>
    `<figure><img width="${s.width}" height="${s.height}" loading="lazy" decoding="async" alt="${P.name}, ${label}, ${loc}" src="${s.src}"><figcaption class="meta">${label}</figcaption></figure>`;
  const swatches = P.colors.map((c) => `<li><span class="swatch" style="background: ${hexRgb(c)};"></span><span class="meta">${c}</span></li>`).join("");
  const main = `<main id="efni" tabindex="-1"><article class="project-page"><nav class="crumbs" aria-label="Brauðmolaslóð"><ol><li><a href="/" data-discover="true">Forsíða</a></li><li><a href="/#verkefni" data-discover="true">Verkefni</a></li><li><span aria-current="page">${P.name}</span></li></ol></nav><img class="project-cover" width="${IMG.hero.width}" height="${IMG.hero.height}" alt="${P.name}, forsíða á tölvuskjá" decoding="async" src="${IMG.hero.src}"><p class="meta">${esc(P.category)}</p><h1>${P.name}</h1><section><h2>Þörfin</h2><p>${esc(P.need)}</p></section><section><h2>Hvað við gerðum</h2><p>${esc(P.did)}</p></section><section><h2>Hvað síðan gerir núna</h2><p>${esc(P.now)}</p><ul class="feature-list">${feature}</ul></section><section><h2>Tölva</h2><div class="shot-grid">${fig(IMG.hero, "Forsíða", P.name, "tölva")}${fig(IMG.services, "Þjónusta", P.name, "tölva")}</div></section><section><h2>Farsími</h2><div class="shot-grid phones">${fig(IMG.mobile, "Forsíða", P.name, "farsími")}</div></section><section><h2>Litir og letur</h2><ul class="swatches">${swatches}</ul><p>Letur: ${P.fonts.join(", ")}</p></section><section><h2>Tækni</h2><ul><li>HTML, CSS og JavaScript</li><li>Cloudflare</li></ul></section><p><a class="button solid" href="${P.url}" target="_blank" rel="noopener noreferrer">Heimsækja vefsíðuna<span class="sr-only"> (opnast í nýjum flipa)</span></a></p></article></main>`;
  if (!/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/.test(html)) throw new Error("Fann ekki main");
  html = html.replace(/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/, () => main);
  write(path.join(root, "verkefni", ID, "index.html"), html);
}

function patchSitemap() {
  const file = path.join(root, "sitemap.xml");
  let s = read(file);
  if (s.includes(`${SITE}${URL_PATH}`)) return;
  const anchor = `  <url><loc>${SITE}/verkefni/draumabilar/</loc>`;
  const line = `  <url><loc>${SITE}${URL_PATH}</loc><lastmod>2026-11-27</lastmod></url>\n`;
  if (!s.includes(anchor)) throw new Error("Fann ekki draumabilar í sitemap");
  s = s.replace(anchor, (m) => m);
  const end = s.indexOf("\n", s.indexOf(anchor)) + 1;
  s = s.slice(0, end) + line + s.slice(end);
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
  writeProjectPage();
  // Footer link on the new page itself (copied from Draumabílar's page, so already there).
  patchSitemap();
  console.log(`Kjarnaverk: ${URL_PATH} skrifuð. Bundle: /assets/${jsName}`);
}

main();
