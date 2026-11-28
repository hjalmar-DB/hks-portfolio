/**
 * Brings the Draumabílar case study in line with draumabilar.is as it is today:
 * copy, Tækni list, feature cards, screenshots, and mentions on home,
 * /vefsidugerd/, /vefsidugerd-reykjavik/ and llms.txt.
 * Idempotent. Run after kjarnaverk.mjs and forms.mjs, and before build.mjs
 * (and before hydration.mjs add), so React #418 markers can be re-applied:
 *   ... && node scripts/kjarnaverk.mjs && node scripts/forms.mjs && node scripts/draumabilar-refresh.mjs && node scripts/build.mjs && node scripts/hydration.mjs add
 *
 * Only states things verified on the live site and in the draumabilar repo.
 * Does not mention staff-only fields or internal tools.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SITE = "https://wobo.is";
const ID = "draumabilar";
const URL_PATH = `/verkefni/${ID}/`;

const IMG = {
  logo: "/assets/logo-lh77_blx.png",
  hero: { src: "/assets/hero-Draum27a.webp", width: 1400, height: 875, label: "Forsíða", enLabel: "Home" },
  inventory: { src: "/assets/inventory-Draum27a.webp", width: 1400, height: 875, label: "Bílar", enLabel: "Inventory" },
  mobile: { src: "/assets/mobile-Draum27a.webp", width: 390, height: 844, label: "Forsíða", enLabel: "Home" },
};

const P = {
  name: "Draumabílar",
  domain: "draumabilar.is",
  url: "https://draumabilar.is",
  category: "Vefþróun · Bílasala",
  summary:
    "Vefsíða fyrir Draumabíla, bílasölu og innflytjanda á Fosshálsi 1. Leit, innflutningur, fjármögnun og aðgangur fyrir viðskiptavini.",
  intro:
    "Vefsíða fyrir Draumabíla, bílasölu og innflytjanda á Fosshálsi 1, 110 Reykjavík. Á síðunni eru bílar til sölu, bílar til innflutnings og síður um þjónustuna.",
  goal: "Bílarnir, innflutningurinn og þjónustan á einum stað.",
  builtLead: "Þetta er á síðunni. Við höfum engar sölutölur.",
  need: "Draumabílar er bílasala og innflytjandi á Fosshálsi 1, 110 Reykjavík. Þau selja bíla á staðnum og flytja inn bíla eftir pöntun.",
  did: "Á draumabilar.is eru listar yfir bíla til sölu, bíla á staðnum og bíla til innflutnings, leit og síur, fjármögnunarreiknir, eyðublað til að selja eða skipta, og síður um innflutning, afhendingar og fyrirtækið.",
  now: "Hægt er að leita og sía, reikna mánaðargreiðslu, vista bíla og bera þá saman, senda fyrirspurn og stofna aðgang til að fylgjast með bíl í sölu eða innflutningi. Bílar á leiðinni eru á eigin lista. Kort á forsíðu vísar á lóðina. Engar sölutölur eru skráðar hér.",
  enDescription:
    "Car dealer and importer at Fossháls 1, 110 Reykjavík. Sells cars on the lot and imports cars to order.",
  colors: ["#0C3C5C", "#5DB6D0", "#f4f7fa", "#22272b"],
  fonts: ["Montserrat"],
  stack: [
    "Custom HTML, CSS, and JavaScript",
    "Node.js",
    "JSON car API",
    "Render",
    "Cloudflare",
  ],
  stackIs: [
    "HTML, CSS og JavaScript",
    "Node.js",
    "JSON-viðmót fyrir bíla",
    "Render",
    "Cloudflare",
  ],
  integrations: [
    {
      key: "Car inventory",
      category: "Inventory",
      en: "Lists of cars for sale, cars on the lot, cars that can be imported, and cars already on the way. Cars for sale are synced from Bilasolur.",
      title: "Bílabirgðir",
      description:
        "Listar yfir bíla til sölu, bíla á staðnum, bíla sem hægt er að flytja inn og bíla sem eru á leiðinni heim. Bílar til sölu koma úr samstillingu við Bílasölur.",
    },
    {
      key: "Search and filters",
      category: "Search",
      en: "The sales list filters by make, trim, price, year, mileage, fuel, gearbox and drivetrain, and can be limited to cars on the lot. An advanced search covers equipment, size and towing. A header search covers cars and pages. A saved search can email the visitor when a matching car is listed.",
      title: "Leit og síur",
      description:
        "Hægt er að leita eftir tegund, undirgerð, verði, árgerð, akstri, eldsneyti, skiptingu og drifi, og takmarka við bíla í stæði. Nánari leit er eftir búnaði, stærð og drætti. Leit í hausnum nær yfir bíla og síður. Hægt er að vista leit og fá tölvupóst þegar svona bíll kemur.",
    },
    {
      key: "Car import",
      category: "Import",
      en: "A page lists cars that can be imported, with terms and a walkthrough of the process. Visitors can send an enquiry about a car. Purchased cars on the way have their own list, with a delivery time when one is recorded.",
      title: "Innflutningur",
      description:
        "Sér síða með bílum sem hægt er að flytja inn, skilmálum og skýringu á ferlinu. Hægt er að senda fyrirspurn um bíl. Keyptir bílar á leiðinni eru á eigin lista, með afhendingartíma þegar hann er skráður.",
    },
    {
      key: "Financing estimate",
      category: "Finance",
      en: "On a car page the calculator shows an estimated monthly payment from price, lender, down payment and term. The calculator is hidden on cars offered for import. A separate page covers financing, and a short form asks for a callback.",
      title: "Fjármögnunarreiknivél",
      description:
        "Á bílssíðu sýnir reiknirinn áætlaða mánaðarlega greiðslu út frá verði, lánveitanda, innborgun og lánstíma. Á bílum sem hægt er að flytja inn er reiknirinn ekki sýndur. Sér síða er um fjármögnun, og stutt eyðublað fyrir þá sem vilja símtal.",
    },
    {
      key: "Sell or trade-in",
      category: "Listing",
      en: "A dedicated page is for listing a car for sale or asking the dealer for an offer.",
      title: "Sala eða skipti",
      description: "Hægt er að skrá bíl til sölu eða biðja söluna um tilboð, á eigin síðu.",
    },
    {
      key: "Saved cars",
      category: "Inventory",
      en: "Visitors can save cars and compare them.",
      title: "Vistir og samanburður",
      description: "Hægt er að vista bíla og bera þá saman.",
    },
    {
      key: "Customer accounts",
      category: "Account",
      en: "Visitors can create an account to follow a car Draumabílar is selling for them, or an imported car. On My pages they can see shipping progress when it is recorded. Staff link the car to the account.",
      title: "Mínar síður",
      description:
        "Hægt er að stofna aðgang til að fylgjast með bíl sem Draumabílar selur, eða innfluttum bíl. Á Mínum síðum er hægt að sjá framvindu flutningsins þegar hún er skráð. Starfsfólk tengir bílinn við aðganginn.",
    },
    {
      key: "Google reviews and map",
      category: "Reviews",
      en: "The homepage shows a Google rating and links out to the lot on Google Maps.",
      title: "Umsagnir og kort",
      description: "Forsíðan sýnir einkunn frá Google og tengil á lóðina á korti.",
    },
    {
      key: "Deliveries",
      category: "Gallery",
      en: "A page shows photographs of handovers at Fossháls 1.",
      title: "Afhendingar",
      description: "Síða með myndum af afhendingum á Fosshálsi 1.",
    },
    {
      key: "Installable site",
      category: "App",
      en: "A web app manifest and an install script are on the page, so the site can be added to a home screen.",
      title: "Heimaskjár",
      description: "Hægt er að bæta síðunni á heimaskjá símans.",
    },
  ],
};

const COPY = {
  vefFrom:
    "Tvö verkefni eru opin hér: Draumabílar og Kjarnaverk. Draumabílar er vefsíða fyrir bílasölu á Fosshálsi 1 í Reykjavík, með leit að bílum og reikni fyrir afborgun. Kjarnaverk er vefsíða fyrir byggingarverktaka, með þjónustu, verkum og beiðni um tilboð. Við birtum ekki sölutölur og bætum ekki við nöfnum sem eru ekki sýnd.",
  vefTo:
    "Tvö verkefni eru opin hér: Draumabílar og Kjarnaverk. Draumabílar er vefsíða fyrir bílasölu og innflytjanda á Fosshálsi 1 í Reykjavík, með leit, innflutningi og fjármögnunarreikni. Kjarnaverk er vefsíða fyrir byggingarverktaka, með þjónustu, verkum og beiðni um tilboð. Við birtum ekki sölutölur og bætum ekki við nöfnum sem eru ekki sýnd.",
  rvkFrom:
    "Verkefnin sem eru sýnd opinberlega eru Draumabílar, bílasala á Fosshálsi 1, 110 Reykjavík, og Kjarnaverk, vefsíða byggingarverktaka. Á síðu Draumabíla er leit að bílum og reiknir fyrir afborgun. Á síðu Kjarnaverks er þjónusta, verk og beiðni um tilboð. Við bætum ekki við nöfnum sem eru ekki á lofti hér og birtum ekki umsagnir viðskiptavina.",
  rvkTo:
    "Verkefnin sem eru sýnd opinberlega eru Draumabílar, bílasala og innflytjandi á Fosshálsi 1, 110 Reykjavík, og Kjarnaverk, vefsíða byggingarverktaka. Á síðu Draumabíla er leit að bílum, innflutningur og reiknir fyrir afborgun. Á síðu Kjarnaverks er þjónusta, verk og beiðni um tilboð. Við bætum ekki við nöfnum sem eru ekki á lofti hér og birtum ekki umsagnir viðskiptavina.",
  llmsFrom:
    "- [Draumabílar](https://wobo.is/verkefni/draumabilar/): verkefni sem er sýnt opinberlega. Bílasíða, ekki netverslun.",
  llmsTo:
    "- [Draumabílar](https://wobo.is/verkefni/draumabilar/): verkefni sem er sýnt opinberlega. Bílasala og innflutningur, ekki netverslun.",
};

const read = (f) => fs.readFileSync(f, "utf8");
const write = (f, t) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
};

function replaceOnce(hay, from, to, label) {
  if (hay.includes(to)) return hay;
  if (!hay.includes(from)) throw new Error(`Fann ekki streng: ${label}`);
  const i = hay.indexOf(from);
  if (hay.indexOf(from, i + from.length) !== -1) throw new Error(`Fleiri en eitt tilvik: ${label}`);
  return hay.slice(0, i) + to + hay.slice(i + from.length);
}

const t = (s) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

function siteObject() {
  const integrations = P.integrations
    .map((i) => `{title:${t(i.key)},category:${t(i.category)},description:${t(i.en)}}`)
    .join(",");
  return `{id:${t(ID)},name:${t(P.name)},domain:${t(P.domain)},url:${t(P.url)},status:\`live\`,category:\`Cars\`,description:${t(P.enDescription)},place:\`Fossháls 1, 110 Reykjavík\`,keywords:[\`dealer\`,\`importer\`,\`fosshals\`,\`reykjavik\`],palette:[\`#5DB6D0\`,\`#0C3C5C\`,\`#061826\`],colors:[${P.colors.map(t).join(",")}],fonts:[${P.fonts.map(t).join(",")}],motif:\`road\`,stack:[${P.stack.map(t).join(",")}],integrations:[${integrations}]}`;
}

function crObject() {
  return `${ID}:{category:${t(P.category)},summary:${t(P.summary)},intro:${t(P.intro)},goal:${t(P.goal)},builtLead:${t(P.builtLead)},case:{need:${t(P.need)},did:${t(P.did)},now:${t(P.now)}}}`;
}

function shotsObject() {
  return `${ID}:{logo:${t(IMG.logo)},shots:[{src:${t(IMG.hero.src)},label:${t(IMG.hero.enLabel)},device:\`desktop\`,width:${IMG.hero.width},height:${IMG.hero.height}},{src:${t(IMG.inventory.src)},label:${t(IMG.inventory.enLabel)},device:\`desktop\`,width:${IMG.inventory.width},height:${IMG.inventory.height}},{src:${t(IMG.mobile.src)},label:${t(IMG.mobile.enLabel)},device:\`mobile\`,width:${IMG.mobile.width},height:${IMG.mobile.height}}]}`;
}

function patchBundle(js) {
  const siteStart = js.indexOf("{id:`draumabilar`,name:`Draumabílar`");
  if (siteStart < 0) throw new Error("Fann ekki draumabilar site-hlut");
  const siteEnd = js.indexOf(",{id:`kjarnaverk`,name:`Kjarnaverk`", siteStart);
  if (siteEnd < 0) throw new Error("Fann ekki enda á draumabilar site-hlut");
  const newSite = siteObject();
  if (js.slice(siteStart, siteEnd) !== newSite) {
    js = js.slice(0, siteStart) + newSite + js.slice(siteEnd);
  }

  const crStart = js.indexOf("draumabilar:{category:`Vefþróun · Bílasala`");
  if (crStart < 0) throw new Error("Fann ekki cr.draumabilar");
  const crEnd = js.indexOf(",kjarnaverk:{category:`Vefsíðuhönnun · Vefþróun`", crStart);
  if (crEnd < 0) throw new Error("Fann ekki enda á cr.draumabilar");
  const newCr = crObject();
  if (js.slice(crStart, crEnd) !== newCr) {
    js = js.slice(0, crStart) + newCr + js.slice(crEnd);
  }

  const shotsStart = js.indexOf("draumabilar:{logo:`/assets/logo-lh77_blx.png`");
  if (shotsStart < 0) throw new Error("Fann ekki draumabilar skjámyndir");
  const shotsEnd = js.indexOf(",kjarnaverk:{logo:", shotsStart);
  if (shotsEnd < 0) throw new Error("Fann ekki enda á draumabilar skjámyndum");
  const newShots = shotsObject();
  if (js.slice(shotsStart, shotsEnd) !== newShots) {
    js = js.slice(0, shotsStart) + newShots + js.slice(shotsEnd);
  }

  // Replace the Icelandic translations for Draumabílar integrations.
  // Keep them just before the Kjarnaverk keys in the dr map.
  const drStart = js.indexOf('dr={"Car inventory":');
  if (drStart < 0) throw new Error("Fann ekki dr þýðingar");
  const drKj = js.indexOf('"Kjarnaverk services":', drStart);
  if (drKj < 0) throw new Error("Fann ekki Kjarnaverk í dr");
  const drNew =
    "dr={" +
    P.integrations
      .map((i) => `${JSON.stringify(i.key)}:{title:${t(i.title)},description:${t(i.description)}}`)
      .join(",") +
    ",";
  js = js.slice(0, drStart) + drNew + js.slice(drKj);

  js = replaceOnce(
    js,
    'fr={"Custom HTML, CSS, and JavaScript":`HTML, CSS og JavaScript`,"JSON car API":`JSON-viðmót fyrir bíla`,Render:`Render`,Cloudflare:`Cloudflare`,"Static HTML and CSS":`HTML og CSS`}',
    'fr={"Custom HTML, CSS, and JavaScript":`HTML, CSS og JavaScript`,"Node.js":`Node.js`,"JSON car API":`JSON-viðmót fyrir bíla`,Render:`Render`,Cloudflare:`Cloudflare`,"Static HTML and CSS":`HTML og CSS`}',
    "stack þýðingar",
  );

  js = replaceOnce(js, COPY.vefFrom, COPY.vefTo, "vefsidugerd málsgrein");
  js = replaceOnce(js, COPY.rvkFrom, COPY.rvkTo, "reykjavik málsgrein");
  return js;
}

function patchHomeCard(html) {
  const oldCard = `<li class="work-card"><a class="work-shot" href="/verkefni/draumabilar/" data-discover="true"><img width="1400" height="543" alt="Skjámynd af Draumabílar. Vefsíða fyrir Draumabíla með leit að bílum og reikni fyrir afborgun." loading="lazy" decoding="async" src="/assets/hero-CCsm2doJ.webp"></a><div class="work-copy"><h3><a href="/verkefni/draumabilar/" data-discover="true">Draumabílar</a></h3><p class="meta">Vefþróun · Bílasala</p><p>Vefsíða fyrir Draumabíla með leit að bílum og reikni fyrir afborgun.</p><a class="text-link" href="/verkefni/draumabilar/" data-discover="true">Skoða verkefni</a></div></li>`;
  const newCard = `<li class="work-card"><a class="work-shot" href="${URL_PATH}" data-discover="true"><img width="${IMG.hero.width}" height="${IMG.hero.height}" alt="${escAttr(`Skjámynd af ${P.name}. ${P.summary}`)}" loading="lazy" decoding="async" src="${IMG.hero.src}"></a><div class="work-copy"><h3><a href="${URL_PATH}" data-discover="true">${P.name}</a></h3><p class="meta">${esc(P.category)}</p><p>${esc(P.summary)}</p><a class="text-link" href="${URL_PATH}" data-discover="true">Skoða verkefni</a></div></li>`;
  if (html.includes(newCard)) return html;
  // Also catch a mid-update card that already has the new summary but old image, or vice versa.
  if (html.includes(oldCard)) return html.split(oldCard).join(newCard);
  const loose = /<li class="work-card"><a class="work-shot" href="\/verkefni\/draumabilar\/"[\s\S]*?<a class="text-link" href="\/verkefni\/draumabilar\/" data-discover="true">Skoða verkefni<\/a><\/div><\/li>/;
  if (!loose.test(html)) throw new Error("Fann ekki Draumabílar spjald á forsíðu");
  return html.replace(loose, () => newCard);
}

function writeProjectPage() {
  const file = path.join(root, "verkefni", ID, "index.html");
  let html = read(file);
  const title = `${P.name} | Verkefni – Wobo`;
  const url = `${SITE}${URL_PATH}`;
  const set = (re, val, label) => {
    if (!re.test(html)) throw new Error(`Fann ekki: ${label}`);
    html = html.replace(re, () => val);
  };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, "title");
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(P.summary)}">`, "description");
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(title)}">`, "og:title");
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(P.summary)}">`, "og:description");
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(title)}">`, "twitter:title");
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(P.summary)}">`, "twitter:description");

  const ldMatch = html.match(/<script id="jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ldMatch) throw new Error("Fann ekki JSON-LD");
  const ld = JSON.parse(ldMatch[1]);
  for (const node of ld["@graph"]) {
    if (node["@type"] === "WebPage") {
      node.name = title;
      node.url = url;
      node.description = P.summary;
    }
  }
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  html = html.replace(
    /<script id="jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    () => `<script id="jsonld" type="application/ld+json">${json}</script>`,
  );

  const feature = P.integrations.map((i) => `<li><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></li>`).join("");
  const fig = (s, loc) =>
    `<figure><img width="${s.width}" height="${s.height}" loading="lazy" decoding="async" alt="${P.name}, ${s.label}, ${loc}" src="${s.src}"><figcaption class="meta">${s.label}</figcaption></figure>`;
  const swatches = P.colors
    .map((c) => `<li><span class="swatch" style="background: ${hexRgb(c)};"></span><span class="meta">${c}</span></li>`)
    .join("");
  const stack = P.stackIs.map((s) => `<li>${esc(s)}</li>`).join("");
  const main = `<main id="efni" tabindex="-1"><article class="project-page"><nav class="crumbs" aria-label="Brauðmolaslóð"><ol><li><a href="/" data-discover="true">Forsíða</a></li><li><a href="/#verkefni" data-discover="true">Verkefni</a></li><li><span aria-current="page">${P.name}</span></li></ol></nav><img class="project-cover" width="${IMG.hero.width}" height="${IMG.hero.height}" alt="${P.name}, forsíða á tölvuskjá" decoding="async" src="${IMG.hero.src}"><p class="meta">${esc(P.category)}</p><h1>${P.name}</h1><section><h2>Þörfin</h2><p>${esc(P.need)}</p></section><section><h2>Hvað við gerðum</h2><p>${esc(P.did)}</p></section><section><h2>Hvað síðan gerir núna</h2><p>${esc(P.now)}</p><ul class="feature-list">${feature}</ul></section><section><h2>Tölva</h2><div class="shot-grid">${fig(IMG.hero, "tölva")}${fig(IMG.inventory, "tölva")}</div></section><section><h2>Farsími</h2><div class="shot-grid phones">${fig(IMG.mobile, "farsími")}</div></section><section><h2>Litir og letur</h2><ul class="swatches">${swatches}</ul><p>Letur: ${P.fonts.join(", ")}</p></section><section><h2>Tækni</h2><ul>${stack}</ul></section><p><a class="button solid" href="${P.url}" target="_blank" rel="noopener noreferrer">Heimsækja vefsíðuna<span class="sr-only"> (opnast í nýjum flipa)</span></a></p></article></main>`;
  if (!/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/.test(html)) throw new Error("Fann ekki main");
  html = html.replace(/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/, () => main);
  write(file, html);
}

function patchCopyPages() {
  const home = path.join(root, "index.html");
  write(home, patchHomeCard(read(home)));

  const vef = path.join(root, "vefsidugerd", "index.html");
  write(vef, replaceOnce(read(vef), COPY.vefFrom, COPY.vefTo, "vefsidugerd html"));

  const rvk = path.join(root, "vefsidugerd-reykjavik", "index.html");
  write(rvk, replaceOnce(read(rvk), COPY.rvkFrom, COPY.rvkTo, "reykjavik html"));
}

function patchLlmsAndBlog() {
  const llms = path.join(root, "llms.txt");
  if (fs.existsSync(llms)) write(llms, replaceOnce(read(llms), COPY.llmsFrom, COPY.llmsTo, "llms.txt"));

  // build.mjs rewrites llms.txt from this template, so keep them in sync.
  const blog = path.join(root, "scripts", "blog.mjs");
  write(blog, replaceOnce(read(blog), COPY.llmsFrom, COPY.llmsTo, "blog.mjs llms"));
}

function main() {
  for (const f of [IMG.hero.src, IMG.inventory.src, IMG.mobile.src]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) throw new Error(`Vantar skjámynd: ${f}`);
  }
  const idx = read(path.join(root, "index.html"));
  const jsName = idx.match(/\/assets\/(index-[^"']+\.js)/)[1];
  const jsPath = path.join(root, "assets", jsName);
  const js = read(jsPath);
  const next = patchBundle(js);
  if (next !== js) write(jsPath, next);
  patchCopyPages();
  writeProjectPage();
  patchLlmsAndBlog();
  console.log(`Draumabílar uppfært. Bundle: /assets/${jsName}`);
}

main();
