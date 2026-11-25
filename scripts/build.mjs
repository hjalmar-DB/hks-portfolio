/**
 * Builds the blog and applies SEO patches onto the published static site.
 * Idempotent: running it twice leaves the same output.
 *
 * Preview vs live: the React bundle bakes robots as either
 * "index, follow" (live, main) or "noindex, nofollow" (preview).
 * This script keeps that default and only overrides routes that must differ
 * (unknown URLs, and /blogg/ while it has no posts).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildFeed,
  buildLlms,
  clientPost,
  indexPayload,
  parseFrontmatter,
  preparePost,
  SITE,
  validatePost,
} from "./blog.mjs";

const root = process.cwd();
const contentDir = path.join(root, "content", "blogg");

const BLOG_CSS = `
.blog-meta{color:var(--muted);font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;margin:.35rem 0 1.1rem}
.blog-cover{border:1px solid var(--line);border-radius:18px;width:100%;height:auto;margin:0 0 1.5rem}
.blog-toc{border:1px solid var(--line);background:var(--surface);border-radius:16px;margin:0 0 1.75rem;padding:1rem 1.15rem 1.1rem}
.blog-toc ol{margin:.35rem 0 0;padding:0 0 0 1.15rem;display:grid;gap:.35rem;list-style:decimal}
.blog-toc a{text-decoration:none}
.blog-toc a:hover{color:var(--accent)}
.blog-body h2{letter-spacing:-.03em;margin:2.1rem 0 .7rem;font-size:clamp(1.55rem,3vw,2.15rem);font-weight:500}
.blog-body h3{letter-spacing:-.02em;margin:1.5rem 0 .45rem;font-size:1.2rem;font-weight:500}
.blog-body p,.blog-body li{color:var(--muted);max-width:40rem}
.blog-body p{margin:0 0 .9rem}
.blog-body ul,.blog-body ol{margin:0 0 1rem;padding-left:1.2rem}
.blog-body ul{list-style:disc}
.blog-body ol{list-style:decimal}
.blog-body li{margin:.3rem 0}
.blog-body a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:.18em}
.blog-body img{border:1px solid var(--line);border-radius:14px;margin:0 0 1rem}
.blog-body blockquote{border-left:2px solid var(--accent);color:var(--muted);margin:0 0 1rem;padding:.15rem 0 .15rem 1rem}
.blog-body code{font-family:var(--mono);font-size:.9em}
.blog-body pre{border:1px solid var(--line);background:var(--surface);border-radius:12px;margin:0 0 1rem;padding:.9rem 1rem;overflow:auto}
.blog-list{display:grid;gap:1rem;margin:1.5rem 0 0;padding:0;list-style:none}
.blog-card{border:1px solid var(--line);background:var(--surface);border-radius:18px}
.blog-card a{text-decoration:none;display:grid;gap:.4rem;padding:1.15rem 1.2rem}
.blog-card h2{letter-spacing:-.03em;margin:0;font-size:clamp(1.35rem,2vw,1.8rem);font-weight:500}
.blog-card p{margin:0;color:var(--muted)}
.blog-card img{border-bottom:1px solid var(--line);border-radius:18px 18px 0 0;width:100%;height:auto}
.blog-empty{border:1px solid var(--line);background:var(--surface);border-radius:18px;margin-top:1.5rem;padding:1.35rem 1.3rem 1.5rem}
.blog-empty h2{margin:.35rem 0 .6rem}
.blog-cta{border:1px solid var(--accent);background:var(--surface);border-radius:18px;margin-top:2.2rem;padding:1.2rem 1.25rem 1.35rem}
.blog-cta h2{margin:.1rem 0 .55rem}
.blog-tags{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1rem;padding:0;list-style:none}
.blog-tags li{border:1px solid var(--line);border-radius:999px;color:var(--muted);font-family:var(--mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:.28rem .6rem}
`.trim();

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function walkHtml(dir = root) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "content" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function hashName(prefix, text, ext) {
  const hash = createHash("sha256").update(text).digest("base64url").slice(0, 8);
  return `${prefix}-${hash}.${ext}`;
}

function replaceAll(hay, from, to) {
  if (!hay.includes(from)) return { text: hay, count: 0 };
  const parts = hay.split(from);
  return { text: parts.join(to), count: parts.length - 1 };
}

function mustReplace(hay, from, to, label) {
  const result = replaceAll(hay, from, to);
  if (result.count === 0 && !hay.includes(to)) {
    throw new Error(`Fann ekki streng til að skipta: ${label}`);
  }
  return result.text;
}

function loadPosts() {
  if (!fs.existsSync(contentDir)) return [];
  const files = fs
    .readdirSync(contentDir)
    .filter((name) => name.endsWith(".md"))
    .sort();
  const parsed = files.map((name) => {
    const full = path.join(contentDir, name);
    const { data, body } = parseFrontmatter(read(full), name);
    validatePost(data, name);
    return {
      file: name,
      draft: data.draft === true,
      title: data.title,
      description: data.description,
      slug: data.slug,
      date: data.date,
      updated: data.updated || data.date,
      author: data.author,
      cover: data.cover || "",
      coverAlt: data.coverAlt || "",
      coverWidth: data.coverWidth || "",
      coverHeight: data.coverHeight || "",
      tags: data.tags || [],
      faq: data.faq || [],
      body,
    };
  });
  const slugs = new Set();
  for (const post of parsed) {
    if (slugs.has(post.slug)) throw new Error(`Tvítekið slug: ${post.slug}`);
    slugs.add(post.slug);
  }
  return parsed.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated));
}

function detectBundle() {
  const html = read(path.join(root, "index.html"));
  const jsMatch = html.match(/\/assets\/(index-[^"]+\.js)/);
  const cssMatch = html.match(/\/assets\/(index-[^"]+\.css)/);
  if (!jsMatch || !cssMatch) throw new Error("Fann ekki index bundle í index.html");
  return {
    jsPath: path.join(root, "assets", jsMatch[1]),
    cssPath: path.join(root, "assets", cssMatch[1]),
    jsName: jsMatch[1],
    cssName: cssMatch[1],
  };
}

function patchBundle(js) {
  let siteIndexable = true;
  const liveRobots = "j(`name`,`robots`,`index, follow`)";
  const previewRobots = "j(`name`,`robots`,`noindex, nofollow`)";
  const livePatched = "j(`name`,`robots`,l||`index, follow`)";
  const previewPatched = "j(`name`,`robots`,l||`noindex, nofollow`)";
  if (js.includes(liveRobots)) {
    js = js.replace(liveRobots, livePatched);
    siteIndexable = true;
  } else if (js.includes(previewRobots)) {
    js = js.replace(previewRobots, previewPatched);
    siteIndexable = false;
  } else if (js.includes(livePatched)) siteIndexable = true;
  else if (js.includes(previewPatched)) siteIndexable = false;
  else throw new Error("Fann ekki robots-stillingu í bundle (preview eða live)");

  const sig = "function ii({title:e,description:t,path:n,crumbs:r,serviceName:i,offers:a,faq:o}){";
  const sig2 = "function ii({title:e,description:t,path:n,crumbs:r,serviceName:i,offers:a,faq:o,robots:l}){";
  if (js.includes(sig)) {
    js = js.replace(sig, sig2);
    const deps = "},[r,t,o,a,n,i,e]),null}function j(e,t,n){";
    const deps2 = "},[r,t,o,a,n,i,e,l]),null}function j(e,t,n){";
    if (!js.includes(deps)) throw new Error("Fann ekki dependency-lista í ii()");
    js = js.replace(deps, deps2);
  } else if (!js.includes(sig2)) {
    throw new Error("Fann ekki ii() í bundle");
  }

  const localeFrom = "j(`property`,`og:site_name`,`Wobo`),j(`property`,`og:image`,";
  const localeTo = "j(`property`,`og:site_name`,`Wobo`),j(`property`,`og:locale`,`is_IS`),j(`property`,`og:image`,";
  if (js.includes(localeFrom)) js = js.replace(localeFrom, localeTo);

  const notFound = "(0,A.jsx)(ii,{title:`Síðan fannst ekki | Wobo`,description:`Þessi slóð er ekki á wobo.is. Wobo er vefsíðustúdíó í Reykjavík.`,path:`/404/`})";
  const notFound2 = "(0,A.jsx)(ii,{title:`Síðan fannst ekki | Wobo`,description:`Þessi slóð er ekki á wobo.is. Wobo er vefsíðustúdíó í Reykjavík.`,path:`/404/`,robots:`noindex, follow`})";
  if (js.includes(notFound)) js = js.replace(notFound, notFound2);
  else if (!js.includes(notFound2)) throw new Error("Fann ekki 404-síðuna í bundle");

  const navLive = "{href:`/verd/`,label:`Verð`}],ar=";
  const navNext = "{href:`/verd/`,label:`Verð`},{href:`/blogg/`,label:`Blogg`}],ar=";
  if (js.includes(navLive)) js = js.replace(navLive, navNext);
  else if (!js.includes(navNext)) throw new Error("Fann ekki aðalvalmynd");

  const footLive = "{href:`/verd/`,label:`Verð`}],or=";
  const footNext = "{href:`/verd/`,label:`Verð`},{href:`/blogg/`,label:`Blogg`}],or=";
  if (js.includes(footLive)) js = js.replace(footLive, footNext);
  else if (!js.includes(footNext)) throw new Error("Fann ekki fótsíðu-tengla");

  js = applyCopy(js);
  return { js, siteIndexable };
}

function applyCopy(text) {
  const pairs = [
    [
      "Vefsíðugerð fyrir fyrirtæki | Wobo",
      "Vefsíðugerð fyrir fyrirtæki | Umfang og verð – Wobo",
    ],
    [
      "Vefsíðugerð fyrir fyrirtæki í Reykjavík. Vefsíða frá 89.000 kr. Pakkar frá 189.000 kr. án vsk. Wobo sendir fast tilboð áður en vinna hefst.",
      "Vefsíðugerð fyrir fyrirtæki: umfang, síður og verð. Vefsíða frá 89.000 kr. Pakkar frá 189.000 kr. án vsk. Fast tilboð áður en vinna hefst.",
    ],
    [
      "Wobo í Reykjavík smíðar vefsíður fyrir fyrirtæki. Síðan á að vera skýr í síma og í tölvu, og verðið á að liggja fyrir áður en við byrjum.",
      "Þessi síða er um umfangið: hvað fylgir vefsíðu og hvað hún kostar. Síðan á að vera skýr í síma og í tölvu, og verðið á að liggja fyrir áður en við byrjum.",
    ],
    [
      "Ef þig vantar vefverslun er sú síða sér. Bókanir og CRM eru líka sér. Verðskráin er á einum stað svo tölurnar séu þær sömu alls staðar.",
      "Ef þig vantar vefverslun er sú síða sér. Bókanir og CRM eru líka sér. Vefsíðugerð í Reykjavík, sem lýsir stúdíóinu, er líka sér síða. Verðskráin er á einum stað svo tölurnar séu þær sömu alls staðar.",
    ],
    [
      "Vefsíðugerð í Reykjavík | Wobo",
      "Vefsíðugerð í Reykjavík | Vefsíðustúdíó – Wobo",
    ],
    [
      "Vefsíðugerð í Reykjavík hjá Wobo. Vefsíður, vefverslanir og CRM fyrir fyrirtæki. Pakkar frá 189.000 kr. án vsk. Fast tilboð fyrst.",
      "Vefsíðustúdíó í Reykjavík. Samband á wobo@wobo.is. Umfang og verð vefsíðu eru á síðunni um vefsíðugerð.",
    ],
    [
      "Wobo er vefsíðustúdíó í Reykjavík. Við smíðum vefsíður, vefverslanir og CRM fyrir fyrirtæki í borginni og annars staðar á Íslandi.",
      "Wobo er vefsíðustúdíó í Reykjavík. Þessi síða er um stúdíóið og samband. Umfang og verð vefsíðu eru á síðunni um vefsíðugerð.",
    ],
    [
      "Bókanakerfi og CRM | Wobo",
      "Bókunarkerfi fyrir lítil fyrirtæki | Wobo",
    ],
    [
      "Bókanir og CRM fyrir lítil fyrirtæki í Reykjavík. Bókanir í Sérlausn frá 259.000 kr. CRM frá 149.000 kr. án vsk. Fast tilboð fyrst.",
      "Bókunarkerfi og tímapantanir á vefnum. Eyðublað eða tenging í Sérlausn, frá 259.000 kr. án vsk. CRM-listinn er á sér síðu.",
    ],
    [
      "CRM fyrir lítil fyrirtæki í Reykjavík. HubSpot, Pipedrive, CRM Light eða sérsmíði. Frá 149.000 kr. án vsk. Bókanir eru sér síða.",
      "CRM-kerfi fyrir lítil fyrirtæki: fyrirspurnir, tilboð og viðskiptavinir á einum lista. HubSpot, Pipedrive, CRM Light eða sérsmíði. Frá 149.000 kr. án vsk.",
    ],
    ["<h1>CRM-kerfi</h1>", "<h1>CRM-kerfi fyrir lítil fyrirtæki</h1>"],
    ["children:`CRM-kerfi`})", "children:`CRM-kerfi fyrir lítil fyrirtæki`})"],
    [
      "{href:`/vefsidugerd/`,label:`Vefsíðugerð`},{href:`/vefverslun/`,label:`Vefverslun`},{href:`/thjonusta/crm/`,label:`CRM`",
      "{href:`/vefsidugerd/`,label:`Umfang og verð vefsíðugerðar`},{href:`/vefverslun/`,label:`Vefverslun`},{href:`/thjonusta/crm/`,label:`CRM`",
    ],
    [
      '<a href="/vefsidugerd/" data-discover="true">Vefsíðugerð</a></li><li><a href="/vefverslun/" data-discover="true">Vefverslun</a></li><li><a href="/thjonusta/crm/" data-discover="true">CRM</a>',
      '<a href="/vefsidugerd/" data-discover="true">Umfang og verð vefsíðugerðar</a></li><li><a href="/vefverslun/" data-discover="true">Vefverslun</a></li><li><a href="/thjonusta/crm/" data-discover="true">CRM</a>',
    ],
  ];
  let next = text;
  for (const [from, to] of pairs) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  next = next.split("Bókanakerfi og CRM").join("Bókunarkerfi");
  next = next.split("Bókanakerfi").join("Bókunarkerfi");
  next = next.split("bókanakerfi").join("bókunarkerfi");
  next = next.split("Nánar um bókunarkerfi og CRM").join("Nánar um bókunarkerfi");
  return next;
}

function injectBlogRuntime(js, payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const block = `/*WOBO_BLOG_START*/
var WoboBlog=JSON.parse(decodeURIComponent(${JSON.stringify(encoded)}));
function woboMeta(e){return (0,u.useEffect)(()=>{document.title=e.title;let t=Zr(e.path);j(\`name\`,\`description\`,e.description),j(\`property\`,\`og:title\`,e.title),j(\`property\`,\`og:description\`,e.description),j(\`property\`,\`og:type\`,e.ogType||\`website\`),j(\`property\`,\`og:url\`,t),j(\`property\`,\`og:site_name\`,\`Wobo\`),j(\`property\`,\`og:locale\`,\`is_IS\`),j(\`property\`,\`og:image\`,e.image||\`https://wobo.is/og.png\`),j(\`property\`,\`og:image:width\`,\`1200\`),j(\`property\`,\`og:image:height\`,\`630\`),j(\`property\`,\`og:image:alt\`,e.imageAlt||\`Wobo\`),j(\`name\`,\`twitter:card\`,\`summary_large_image\`),j(\`name\`,\`twitter:title\`,e.title),j(\`name\`,\`twitter:description\`,e.description),j(\`name\`,\`twitter:image\`,e.image||\`https://wobo.is/og.png\`),j(\`name\`,\`robots\`,e.robots),ai(\`canonical\`,t),ai(\`alternate\`,t,\`is\`);let n=document.head.querySelector(\`link[rel="alternate"][type="application/rss+xml"]\`);n||(n=document.createElement(\`link\`),n.rel=\`alternate\`,n.type=\`application/rss+xml\`,n.title=\`Wobo blogg\`,document.head.appendChild(n)),n.href=\`https://wobo.is/blogg/feed.xml\`;let r=document.getElementById(\`jsonld\`);if(r&&e.jsonld)r.textContent=JSON.stringify(e.jsonld)},[e.title,e.description,e.path,e.robots,e.ogType,e.image,e.imageAlt,e.jsonld])}
function WoboBlogIndex(){woboMeta({title:WoboBlog.indexTitle,description:WoboBlog.indexDescription,path:\`/blogg/\`,robots:WoboBlog.indexRobots,jsonld:WoboBlog.indexJsonld,ogType:\`website\`,image:\`https://wobo.is/og.png\`,imageAlt:\`Wobo\`});return (0,A.jsx)(\`article\`,{className:\`band page-copy blog-index\`,dangerouslySetInnerHTML:{__html:WoboBlog.indexHtml}})}
function WoboBlogPost(){let {slug:e}=gt();let t=WoboBlog.posts.find(n=>n.slug===e);woboMeta(t?{title:t.titleTag,description:t.description,path:t.path,robots:WoboBlog.postRobots,jsonld:t.jsonld,ogType:\`article\`,image:t.image,imageAlt:t.imageAlt}:{title:\`Greinin fannst ekki | Wobo\`,description:\`Þessi grein er ekki á wobo.is.\`,path:\`/blogg/\${e||\`\`}/\`,robots:WoboBlog.missingRobots,jsonld:WoboBlog.missingJsonld,ogType:\`website\`,image:\`https://wobo.is/og.png\`,imageAlt:\`Wobo\`});return (0,A.jsx)(\`article\`,{className:t?\`band page-copy blog-post\`:\`band page-copy\`,dangerouslySetInnerHTML:{__html:t?t.html:WoboBlog.missingHtml}})}
/*WOBO_BLOG_END*/
`;
  const start = js.indexOf("/*WOBO_BLOG_START*/");
  const end = js.indexOf("/*WOBO_BLOG_END*/");
  if (start !== -1 && end !== -1) {
    js = js.slice(0, start) + block + js.slice(end + "/*WOBO_BLOG_END*/".length);
  } else if (start === -1 && end === -1) {
    const marker = "function Ai(){";
    const at = js.indexOf(marker);
    if (at === -1) throw new Error("Fann ekki Ai() til að skeyta bloggi");
    js = js.slice(0, at) + block + js.slice(at);
  } else {
    throw new Error("Blogg-merki í bundle eru ójöfn");
  }

  const routes = "/*WOBO_BLOG_ROUTES*/(0,A.jsx)(Rt,{path:`/blogg`,element:(0,A.jsx)(WoboBlogIndex,{})}),(0,A.jsx)(Rt,{path:`/blogg/`,element:(0,A.jsx)(WoboBlogIndex,{})}),(0,A.jsx)(Rt,{path:`/blogg/:slug`,element:(0,A.jsx)(WoboBlogPost,{})}),(0,A.jsx)(Rt,{path:`/blogg/:slug/`,element:(0,A.jsx)(WoboBlogPost,{})}),/*WOBO_BLOG_ROUTES_END*/";
  const routeStart = js.indexOf("/*WOBO_BLOG_ROUTES*/");
  const routeEnd = js.indexOf("/*WOBO_BLOG_ROUTES_END*/");
  if (routeStart !== -1 && routeEnd !== -1) {
    js = js.slice(0, routeStart) + routes + js.slice(routeEnd + "/*WOBO_BLOG_ROUTES_END*/".length);
  } else {
    const splat = "(0,A.jsx)(Rt,{path:`*`,element:(0,A.jsx)(Ci,{})})";
    if (!js.includes(splat)) throw new Error("Fann ekki 404-leið");
    js = js.replace(splat, `${routes}${splat}`);
  }
  js = js.replace(/\/\*WOBO_BLOG_END\*\/\n+function Ai/, "/*WOBO_BLOG_END*/\nfunction Ai");
  return js;
}

function patchCss(css) {
  const start = "/*WOBO_BLOG_CSS_START*/";
  const end = "/*WOBO_BLOG_CSS_END*/";
  const block = `${start}${BLOG_CSS}${end}`;
  const a = css.indexOf(start);
  const b = css.indexOf(end);
  if (a !== -1 && b !== -1) return css.slice(0, a) + block + css.slice(b + end.length);
  return css + block;
}

function patchHtmlShell(html) {
  let next = applyCopy(html);
  const navFrom = '<a href="/verd/">Verð</a></nav>';
  const navTo = '<a href="/verd/">Verð</a><a href="/blogg/">Blogg</a></nav>';
  if (next.includes(navFrom)) next = next.replace(navFrom, navTo);
  const footFrom = '<li><a href="/verd/" data-discover="true">Verð</a></li></ul>';
  const footTo = '<li><a href="/verd/" data-discover="true">Verð</a></li><li><a href="/blogg/" data-discover="true">Blogg</a></li></ul>';
  if (next.includes(footFrom)) next = next.replaceAll(footFrom, footTo);
  if (!next.includes('property="og:locale"')) {
    next = next.replace(
      '<meta property="og:site_name" content="Wobo">',
      '<meta property="og:site_name" content="Wobo">\n    <meta property="og:locale" content="is_IS">',
    );
  }
  if (!next.includes("/blogg/feed.xml")) {
    next = next.replace(
      "</head>",
      '    <link rel="alternate" type="application/rss+xml" title="Wobo blogg" href="https://wobo.is/blogg/feed.xml">\n  </head>',
    );
  }
  return next;
}

function setAttr(html, tagPattern, value) {
  if (!tagPattern.test(html)) throw new Error(`Fann ekki merki: ${tagPattern}`);
  return html.replace(tagPattern, value);
}

function blogDocument(shell, page) {
  let html = shell;
  html = setAttr(html, /<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
  html = setAttr(
    html,
    /<meta name="robots" content="[^"]*">/,
    `<meta name="robots" content="${page.robots}">`,
  );
  html = setAttr(
    html,
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${page.description}">`,
  );
  html = setAttr(
    html,
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${page.canonical}">`,
  );
  html = setAttr(
    html,
    /<link rel="alternate" hreflang="is" href="[^"]*">/,
    `<link rel="alternate" hreflang="is" href="${page.canonical}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${page.title}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${page.description}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:type" content="[^"]*">/,
    `<meta property="og:type" content="${page.ogType}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${page.canonical}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${page.image}">`,
  );
  html = setAttr(
    html,
    /<meta property="og:image:alt" content="[^"]*">/,
    `<meta property="og:image:alt" content="${page.imageAlt}">`,
  );
  html = setAttr(
    html,
    /<meta name="twitter:image" content="[^"]*">/,
    `<meta name="twitter:image" content="${page.image}">`,
  );
  html = setAttr(
    html,
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${page.title}">`,
  );
  html = setAttr(
    html,
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${page.description}">`,
  );
  const json = JSON.stringify(page.jsonld).replace(/</g, "\\u003c");
  html = html.replace(
    /<script id="jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="jsonld" type="application/ld+json">${json}</script>`,
  );
  const main = `<main id="efni" tabindex="-1"><article class="${page.articleClass}">${page.inner}</article></main>`;
  if (!/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/.test(html)) {
    throw new Error("Fann ekki <main> í skel");
  }
  html = html.replace(/<main id="efni" tabindex="-1">[\s\S]*?<\/main>/, main);
  return html;
}

function attr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function updateSitemap(posts) {
  const file = path.join(root, "sitemap.xml");
  const current = read(file).replace(/\r\n/g, "\n");
  const withoutBlog = current
    .split("\n")
    .filter((line) => !line.includes("/blogg"))
    .join("\n")
    .replace(/\n{3,}/g, "\n");
  if (!posts.length) {
    write(file, withoutBlog.endsWith("\n") ? withoutBlog : `${withoutBlog}\n`);
    return;
  }
  const urls = [
    `  <url><loc>${SITE}/blogg/</loc><lastmod>${posts[0].updated}</lastmod></url>`,
    ...posts.map(
      (post) =>
        `  <url><loc>${SITE}/blogg/${post.slug}/</loc><lastmod>${post.updated}</lastmod></url>`,
    ),
  ];
  const next = withoutBlog.replace("</urlset>", `${urls.join("\n")}\n</urlset>`);
  write(file, next.endsWith("\n") ? next : `${next}\n`);
}

function copyImages() {
  const from = path.join(contentDir, "myndir");
  const to = path.join(root, "blogg", "myndir");
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (name === ".gitkeep") continue;
    const src = path.join(from, name);
    if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(to, name));
  }
}

function resetBlogDir() {
  const dir = path.join(root, "blogg");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function retargetAssets(html, jsFrom, jsTo, cssFrom, cssTo) {
  return html.split(jsFrom).join(jsTo).split(cssFrom).join(cssTo);
}

function main() {
  const bundle = detectBundle();
  let js = read(bundle.jsPath);
  let css = read(bundle.cssPath);
  const patched = patchBundle(js);
  js = patched.js;
  const postsRaw = loadPosts();
  const preparedInput = postsRaw.map((post) => ({ ...post }));
  const prepared = preparedInput.map((post) => preparePost(post, preparedInput));
  const index = indexPayload(prepared, patched.siteIndexable);
  const postRobots = patched.siteIndexable ? "index, follow" : "noindex, nofollow";
  const payload = {
    siteIndexable: patched.siteIndexable,
    indexTitle: index.indexTitle,
    indexDescription: index.indexDescription,
    indexRobots: index.indexRobots,
    indexHtml: index.indexHtml,
    indexJsonld: index.indexJsonld,
    missingHtml: index.missingHtml,
    missingJsonld: index.missingJsonld,
    missingRobots: patched.siteIndexable ? "noindex, follow" : "noindex, nofollow",
    postRobots,
    posts: prepared.map(clientPost),
  };
  js = injectBlogRuntime(js, payload);
  css = patchCss(css);

  const jsFile = hashName("index", js, "js");
  const cssFile = hashName("index", css, "css");
  write(path.join(root, "assets", jsFile), js);
  write(path.join(root, "assets", cssFile), css);
  if (jsFile !== bundle.jsName) fs.rmSync(bundle.jsPath, { force: true });
  if (cssFile !== bundle.cssName) fs.rmSync(bundle.cssPath, { force: true });

  for (const file of walkHtml()) {
    if (file.split(path.sep).includes("blogg")) continue;
    let html = read(file);
    html = retargetAssets(html, bundle.jsName, jsFile, bundle.cssName, cssFile);
    html = patchHtmlShell(html);
    if (file.endsWith(`${path.sep}404.html`) || file === path.join(root, "404.html")) {
      html = html.replace(
        /<meta name="robots" content="[^"]*">/,
        '<meta name="robots" content="noindex, follow">',
      );
    }
    write(file, html);
  }

  const shell = read(path.join(root, "vefsidugerd", "index.html"));
  resetBlogDir();
  copyImages();
  const indexPage = {
    title: attr(index.indexTitle),
    description: attr(index.indexDescription),
    robots: index.indexRobots,
    canonical: `${SITE}/blogg/`,
    ogType: "website",
    image: `${SITE}/og.png`,
    imageAlt: "Wobo",
    jsonld: index.indexJsonld,
    articleClass: "band page-copy blog-index",
    inner: index.indexHtml,
  };
  write(path.join(root, "blogg", "index.html"), blogDocument(shell, indexPage));
  for (const post of prepared) {
    const page = {
      title: attr(post.titleTag),
      description: attr(post.description),
      robots: postRobots,
      canonical: `${SITE}${post.path}`,
      ogType: "article",
      image: attr(post.image),
      imageAlt: attr(post.imageAlt),
      jsonld: post.jsonld,
      articleClass: "band page-copy blog-post",
      inner: post.html,
    };
    write(path.join(root, "blogg", post.slug, "index.html"), blogDocument(shell, page));
  }
  write(path.join(root, "blogg", "feed.xml"), buildFeed(prepared));
  write(path.join(root, "llms.txt"), buildLlms(prepared));
  updateSitemap(prepared);

  const published = prepared.map((post) => post.slug);
  console.log(
    `Blogg: ${published.length} birtar greinar${published.length ? ` (${published.join(", ")})` : ""}. ${patched.siteIndexable ? "Live (index)" : "Preview (noindex)"}.`,
  );
  console.log(`Bundle: /assets/${jsFile}`);
  console.log(`CSS: /assets/${cssFile}`);
}

main();
