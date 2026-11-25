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

const draft = parseFrontmatter(read("content/blogg/hvad-fylgir-vefsidu.md"), "hvad-fylgir-vefsidu.md");
validatePost(draft.data, "hvad-fylgir-vefsidu.md");
check(draft.data.draft === true, "example post is not draft");
const rendered = renderMarkdown(draft.body);
check(rendered.html.includes("<h2"), "draft markdown did not render an h2");
check(rendered.html.includes('href="/verd/"'), "draft markdown lost an internal link");
check(rendered.html.includes('loading="lazy"'), "draft image is not lazy");
check(rendered.toc.length >= 2, "draft is missing a table of contents");
check(!fs.existsSync(path.join(root, "blogg", "hvad-fylgir-vefsidu")), "draft post was published");

const blog = read("blogg/index.html");
check(blog.includes("Greinar koma brátt"), "empty blog state missing");
check(blog.includes('content="noindex, follow"'), "empty blog is not noindex");
check(blog.includes('rel="canonical" href="https://wobo.is/blogg/"'), "blog canonical missing");
check(blog.includes("<title>Blogg | Wobo</title>"), "blog title missing");
check(blog.includes("og:description"), "blog og description missing");
check(blog.includes("twitter:title"), "blog twitter title missing");
check(blog.includes("BreadcrumbList"), "blog breadcrumbs json-ld missing");
check(blog.includes('href="/blogg/">Blogg</a>'), "blog nav link missing on the blog page");
check(!blog.includes("hvad-fylgir-vefsidu"), "draft slug leaked into the blog index");

const feed = read("blogg/feed.xml");
check(feed.includes("<rss version=\"2.0\">"), "feed is not rss");
check(feed.includes("<language>is</language>"), "feed language missing");
check(!feed.includes("<item>"), "feed published the draft");

const sitemap = read("sitemap.xml");
check(!sitemap.includes("/blogg"), "empty noindex blog was added to the sitemap");
check(sitemap.includes("https://wobo.is/vefsidugerd/"), "sitemap lost an existing url");

const llms = read("llms.txt");
for (const bit of ["wobo@wobo.is", "89.000", "189.000", "259.000", "149.000", "16.900", "https://wobo.is/blogg/", "Bókunarkerfi", "Reykjavík"]) {
  check(llms.includes(bit), `llms.txt missing ${bit}`);
}

const notFound = read("404.html");
check(notFound.includes('content="noindex, follow"'), "404.html is still indexable");

const booking = read("bokunarkerfi-og-crm/index.html");
check(booking.includes("<title>Bókunarkerfi fyrir lítil fyrirtæki | Wobo</title>"), "booking title was not differentiated");
check(booking.includes("<h1>Bókunarkerfi</h1>"), "booking h1 was not differentiated");
check(!booking.includes("Bókanakerfi"), "booking page still has the typo");
check(booking.includes("CRM-listinn er á sér síðu"), "booking description was not differentiated");

const crm = read("thjonusta/crm/index.html");
check(crm.includes("<h1>CRM-kerfi fyrir lítil fyrirtæki</h1>"), "crm h1 was not differentiated");
check(crm.includes("fyrirspurnir, tilboð og viðskiptavinir"), "crm description was not differentiated");
check(crm.includes("Nánar um bókunarkerfi"), "crm page does not cross-link to bookings");

const general = read("vefsidugerd/index.html");
check(general.includes("Umfang og verð"), "general web page title was not differentiated");
check(general.includes("Vefsíðugerð í Reykjavík, sem lýsir stúdíóinu"), "general page does not point at the local page");
check(!general.includes("Vefsíðugerð fyrir fyrirtæki í Reykjavík."), "general description still leads with Reykjavík");

const local = read("vefsidugerd-reykjavik/index.html");
check(local.includes("Vefsíðustúdíó – Wobo"), "local title was not differentiated");
check(local.includes("Umfang og verð vefsíðugerðar"), "local page does not cross-link to the general page");
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
check(blogState.indexHtml?.includes("Greinar koma brátt"), "client blog state missing");
check(blogState.indexRobots === "noindex, follow", "client blog robots are not noindex while empty");
check(Array.isArray(blogState.posts) && blogState.posts.length === 0, "client bundle published a post");
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
check(blogRes.text.includes("Greinar koma brátt"), "/blogg/ body missing empty state");

const feedRes = await get("/blogg/feed.xml");
check(feedRes.response.status === 200, "feed was not served");

server.close();

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("verify ok");
