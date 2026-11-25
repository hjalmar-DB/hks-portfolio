/**
 * Checks the built blog, SEO copy, llms.txt, sitemap, and security headers.
 * Serves the site locally with the headers from render.yaml.
 */
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, renderMarkdown, validatePost } from "./blog.mjs";

const root = process.cwd();
const failures = [];

function check(cond, message) {
  if (!cond) failures.push(message);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function parseHeaders(yaml) {
  const headers = [];
  const lines = yaml.split("\n");
  let current = null;
  for (const line of lines) {
    const pathMatch = /^\s+-\s+path:\s*(.+)$/.exec(line);
    const nameMatch = /^\s+name:\s*(.+)$/.exec(line);
    const valueMatch = /^\s+value:\s*(.*)$/.exec(line);
    if (pathMatch) {
      current = { path: unquote(pathMatch[1]), name: "", value: "" };
      headers.push(current);
    } else if (nameMatch && current) current.name = unquote(nameMatch[1]);
    else if (valueMatch && current) current.value = unquote(valueMatch[1]);
  }
  return headers;
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
  return trimmed;
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (file.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function headersFor(urlPath, rules) {
  const out = [];
  for (const rule of rules) {
    if (rule.path === "/*" || urlPath === rule.path) out.push([rule.name, rule.value]);
  }
  return out;
}

function startServer(rules) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const candidates = [
        path.join(root, urlPath),
        path.join(root, urlPath, "index.html"),
      ];
      let file = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      let status = 200;
      if (!file) {
        file = path.join(root, "404.html");
        status = 404;
      }
      const body = fs.readFileSync(file);
      res.statusCode = status;
      res.setHeader("Content-Type", contentType(file));
      for (const [name, value] of headersFor(urlPath, rules)) res.setHeader(name, value);
      if (status === 404) res.setHeader("X-Robots-Tag", "noindex, follow");
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

check(!fs.existsSync(path.join(root, "content/blogg/hvad-fylgir-vefsidu.md")), "merged draft still exists");
check(!fs.existsSync(path.join(root, "blogg", "hvad-fylgir-vefsidu")), "removed post was published");

const articleSource = parseFrontmatter(read("content/blogg/hvad-kostar-vefsida.md"), "hvad-kostar-vefsida.md");
validatePost(articleSource.data, "hvad-kostar-vefsida.md");
check(articleSource.data.draft !== true, "article is still a draft");
check(articleSource.data.slug === "hvad-kostar-vefsida", "article slug changed");
const rendered = renderMarkdown(articleSource.body);
check(rendered.html.includes("<h2"), "article markdown did not render an h2");
check(rendered.html.includes('href="/verd/"'), "article markdown lost an internal link");
check(rendered.toc.length >= 2, "article is missing a table of contents");

const blog = read("blogg/index.html");
check(!blog.includes("Greinar koma brátt"), "empty blog state is still showing");
check(!blog.includes("noindex"), "blog index is noindex");
check(blog.includes('content="index, follow"'), "blog index is not indexable");
check(blog.includes('rel="canonical" href="https://wobo.is/blogg/"'), "blog canonical missing");
check(blog.includes("<title>Blogg | Wobo</title>"), "blog title missing");
check(blog.includes("og:description"), "blog og description missing");
check(blog.includes("twitter:title"), "blog twitter title missing");
check(blog.includes("BreadcrumbList"), "blog breadcrumbs json-ld missing");
check(blog.includes('href="/blogg/">Blogg</a>'), "blog nav link missing on the blog page");
check(blog.includes("/blogg/hvad-kostar-vefsida/"), "published article missing from the blog index");
check(!blog.includes("hvad-fylgir-vefsidu"), "removed slug leaked into the blog index");

const article = read("blogg/hvad-kostar-vefsida/index.html");
check(
  article.includes("<title>Hvað kostar vefsíða á Íslandi? Verð og kostnaðarliðir | Wobo blogg</title>"),
  "article title missing",
);
check(
  article.includes(
    'name="description" content="Hvað kostar vefsíða? Við förum yfir verðbilið á íslenskum markaði, hvað ræður verðinu, kostnað sem gleymist og verð Wobo, frá 89.000 kr. án vsk."',
  ),
  "article meta description missing",
);
check(article.includes('"@type":["Article","BlogPosting"]'), "article Article json-ld missing");
check(article.includes('"@type":"FAQPage"'), "article FAQPage json-ld missing");
check(article.includes('rel="canonical" href="https://wobo.is/blogg/hvad-kostar-vefsida/"'), "article canonical missing");
check(!article.includes("noindex"), "article is noindex");

const feed = read("blogg/feed.xml");
check(feed.includes("<rss version=\"2.0\">"), "feed is not rss");
check(feed.includes("<language>is</language>"), "feed language missing");
check(feed.includes("https://wobo.is/blogg/hvad-kostar-vefsida/"), "feed is missing the article");
check(!feed.includes("hvad-fylgir-vefsidu"), "feed still lists the removed post");

const sitemap = read("sitemap.xml");
check(sitemap.includes("https://wobo.is/blogg/</loc>"), "sitemap is missing /blogg/");
check(sitemap.includes("https://wobo.is/blogg/hvad-kostar-vefsida/</loc>"), "sitemap is missing the article");
check(sitemap.includes("<lastmod>2026-11-30</lastmod>"), "sitemap lastmod is not the article date");
check(sitemap.includes("https://wobo.is/vefsidugerd/"), "sitemap lost an existing url");
check(!sitemap.includes("hvad-fylgir-vefsidu"), "sitemap still lists the removed post");

const llms = read("llms.txt");
for (const bit of [
  "wobo@wobo.is",
  "89.000",
  "189.000",
  "259.000",
  "149.000",
  "16.900",
  "https://wobo.is/blogg/",
  "https://wobo.is/blogg/hvad-kostar-vefsida/",
  "Bókunarkerfi",
  "Reykjavík",
]) {
  check(llms.includes(bit), `llms.txt missing ${bit}`);
}
check(!llms.includes("Engar greinar hafa birst"), "llms.txt still says the blog is empty");
check(!llms.includes("hvad-fylgir-vefsidu"), "llms.txt still lists the removed post");

const ownership =
  "Vefurinn er ykkar eign eftir afhendingu. Þið eigið líka textann og myndirnar sem þið leggið til. Ef þið kaupið umsjón höldum við áfram að uppfæra. Annars lýkur okkar vinnu við afhendingu.";
const verd = read("verd/index.html");
const verdFaq = (verd.match(new RegExp(ownership.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
check(verdFaq >= 2, "verd FAQ answer missing from the page and JSON-LD");
check(!verd.includes("Annars skiljum við við verkið þegar það er afhent."), "old verd FAQ answer remains");

const notFound = read("404.html");
check(notFound.includes('content="noindex, follow"'), "404.html is still indexable");

const booking = read("bokunarkerfi-og-crm/index.html");
check(booking.includes("<title>Bókunarkerfi fyrir lítil fyrirtæki | Wobo</title>"), "booking title was not differentiated");
check(booking.includes("<h1>Bókunarkerfi</h1>"), "booking h1 was not differentiated");
check(!booking.includes("Bókanakerfi"), "booking page still has the typo");
check(booking.includes("CRM er á sér síðu"), "booking description was not differentiated");

const crm = read("thjonusta/crm/index.html");
check(crm.includes("<h1>CRM-kerfi fyrir lítil fyrirtæki</h1>"), "crm h1 was not differentiated");
check(crm.includes("fyrirspurnir, tilboð og viðskiptavinir"), "crm description was not differentiated");
check(crm.includes("Nánar um bókunarkerfi"), "crm page does not cross-link to bookings");

const general = read("vefsidugerd/index.html");
check(general.includes("Umfang og verð"), "general web page title was not differentiated");
check(general.includes("Um stúdíóið sjálft má lesa á síðunni Vefsíðugerð í Reykjavík."), "general page does not point at the local page");
check(!general.includes("Vefsíðugerð fyrir fyrirtæki í Reykjavík."), "general description still leads with Reykjavík");

const local = read("vefsidugerd-reykjavik/index.html");
check(local.includes("Vefsíðustúdíó – Wobo"), "local title was not differentiated");
check(local.includes("Vefsíðugerð: umfang og verð"), "local page does not cross-link to the general page");
check(local.includes('content="is_IS"'), "og:locale missing");

const home = read("index.html");
check(home.includes('href="/blogg/">Blogg</a>'), "home nav is missing Blogg");
check(home.includes('href="/blogg/" data-discover="true">Blogg</a>'), "home footer is missing Blogg");
check(!home.includes("Bókanakerfi"), "home still has the typo");
const jsName = home.match(/\/assets\/(index-[^"]+\.js)/)[1];
const js = read(`assets/${jsName}`);
check(js.includes('path:`/blogg`'), "client router is missing /blogg");
const encoded = js.match(/decodeURIComponent\("([^"]+)"\)/);
check(encoded, "client blog payload missing");
const blogState = encoded ? JSON.parse(decodeURIComponent(encoded[1])) : {};
check(!blogState.indexHtml?.includes("Greinar koma brátt"), "client blog still shows the empty state");
check(blogState.indexRobots === "index, follow", "client blog robots are not indexable");
check(
  Array.isArray(blogState.posts) && blogState.posts.length === 1 && blogState.posts[0].slug === "hvad-kostar-vefsida",
  "client bundle is missing the published article",
);
check(js.includes(ownership), "bundle is missing the updated ownership answer");
check(js.includes("l||`index, follow`"), "live robots default was overwritten");
check(js.includes("robots:`noindex, follow`"), "404 route does not set noindex");
check(js.includes("formsubmit.co"), "quote form endpoint was lost");
check(!js.includes("Bókanakerfi"), "bundle still has the typo");

const rules = parseHeaders(read("render.yaml"));
for (const name of [
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "X-Frame-Options",
  "Content-Security-Policy",
  "Strict-Transport-Security",
]) {
  check(rules.some((rule) => rule.path === "/*" && rule.name === name && rule.value), `render.yaml missing ${name}`);
}
check(
  rules.some((rule) => rule.name === "Content-Security-Policy" && rule.value.includes("frame-ancestors")),
  "CSP is not limited to frame-ancestors",
);

const server = await startServer(rules);
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function get(urlPath) {
  const response = await fetch(base + urlPath);
  const text = await response.text();
  return { response, text };
}

const live = await get("/");
check(live.response.status === 200, "home did not return 200");
check(live.response.headers.get("x-content-type-options") === "nosniff", "nosniff header missing");
check(live.response.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "referrer policy missing");
check(live.response.headers.get("x-frame-options") === "DENY", "frame options missing");
check(live.response.headers.get("content-security-policy") === "frame-ancestors 'none'", "frame-ancestors missing");
check(live.response.headers.get("strict-transport-security") === "max-age=31536000", "hsts missing");
check((live.response.headers.get("permissions-policy") || "").includes("camera=()"), "permissions policy missing");

const missing = await get("/ekki-til-sida");
check(missing.response.status === 404, "unknown route did not return 404");
check(missing.text.includes('content="noindex, follow"'), "404 body is not noindex");
check(missing.response.headers.get("x-robots-tag") === "noindex, follow", "404 status is missing X-Robots-Tag");

const llmsRes = await get("/llms.txt");
check(llmsRes.response.status === 200, "llms.txt was not served");
check(llmsRes.response.headers.get("content-type").includes("text/plain"), "llms.txt content type");

const blogRes = await get("/blogg/");
check(blogRes.response.status === 200, "/blogg/ was not served");
check(!blogRes.text.includes("Greinar koma brátt"), "/blogg/ still shows the empty state");
check(blogRes.text.includes("/blogg/hvad-kostar-vefsida/"), "/blogg/ is missing the article");
check(!blogRes.text.includes("noindex"), "/blogg/ response is noindex");

const articleRes = await get("/blogg/hvad-kostar-vefsida/");
check(articleRes.response.status === 200, "article was not served");
check(articleRes.text.includes("Hvað kostar vefsíða á Íslandi?"), "article response is missing the title");
check(articleRes.text.includes('"@type":"FAQPage"'), "article response is missing FAQPage");
check(!articleRes.text.includes("noindex"), "article response is noindex");

const feedRes = await get("/blogg/feed.xml");
check(feedRes.response.status === 200, "feed was not served");
check(feedRes.text.includes("https://wobo.is/blogg/hvad-kostar-vefsida/"), "served feed is missing the article");

server.close();

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("verify ok");
