/**
 * Markdown blog for wobo.is.
 * Posts live in content/blogg/*.md. draft: true is parsed but not published.
 */

export const SITE = "https://wobo.is";

const MONTHS = [
  "janúar",
  "febrúar",
  "mars",
  "apríl",
  "maí",
  "júní",
  "júlí",
  "ágúst",
  "september",
  "október",
  "nóvember",
  "desember",
];

const SLUG_MAP = {
  á: "a",
  ð: "d",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ý: "y",
  þ: "th",
  æ: "ae",
  ö: "o",
};

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function absUrl(path) {
  if (!path) return `${SITE}/`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path === "/") return `${SITE}/`;
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return `${SITE}${withSlash}`;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value) {
  const raw = unquote(value);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

export function parseFrontmatter(source, filename) {
  const text = source.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) {
    throw new Error(`${filename}: vantar frontmatter (byrjar á ---)`);
  }
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${filename}: frontmatter er ekki lokað`);
  const raw = text.slice(4, end);
  const body = text.slice(end + 5).replace(/^\n/, "");
  const data = {};
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const match = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!match) throw new Error(`${filename}: ólæsileg lína í frontmatter: ${line}`);
    const key = match[1];
    const rest = match[2];
    if (rest === "") {
      if (key === "tags") {
        const tags = [];
        i += 1;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          tags.push(unquote(lines[i].replace(/^\s+-\s+/, "")));
          i += 1;
        }
        data.tags = tags;
        continue;
      }
      if (key === "faq") {
        const faq = [];
        i += 1;
        while (i < lines.length && /^\s+-\s+q:/.test(lines[i])) {
          const q = unquote(lines[i].replace(/^\s+-\s+q:\s*/, ""));
          i += 1;
          if (i >= lines.length || !/^\s+a:/.test(lines[i])) {
            throw new Error(`${filename}: FAQ vantar a: á eftir q: ${q}`);
          }
          const a = unquote(lines[i].replace(/^\s+a:\s*/, ""));
          faq.push({ q, a });
          i += 1;
        }
        data.faq = faq;
        continue;
      }
    }
    data[key] = parseScalar(rest);
    i += 1;
  }
  return { data, body };
}

function slugify(text) {
  let out = "";
  for (const char of text.toLowerCase()) out += SLUG_MAP[char] ?? char;
  return out
    .replace(/[`*_]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function inline(src) {
  const tokens = [];
  let text = src.replace(/`([^`]+)`/g, (_, code) => {
    const index = tokens.push(`<code>${escapeHtml(code)}</code>`) - 1;
    return `\u0000${index}\u0000`;
  });
  text = escapeHtml(text);
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, href) => {
    return `<img src="${href}" alt="${alt}" loading="lazy" decoding="async">`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const decoded = href.replace(/&amp;/g, "&");
    if (/^https?:\/\//.test(decoded)) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    return `<a href="${href}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
  return text;
}

function markdownBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let para = [];
  let list = null;
  let quote = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "quote", text: quote.join(" ") });
      quote = [];
    }
  };
  const flush = () => {
    flushPara();
    flushList();
    flushQuote();
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flush();
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", text: buf.join("\n") });
      i += 1;
      continue;
    }
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }
    if (line.trim() === "---") {
      flush();
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "h", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      flushPara();
      flushList();
      quote.push(line.slice(2));
      i += 1;
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const tag = ul ? "ul" : "ol";
      if (!list || list.tag !== tag) {
        flushList();
        list = { type: "list", tag, items: [] };
      }
      list.items.push((ul || ol)[1]);
      i += 1;
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
    i += 1;
  }
  flush();
  return blocks;
}

export function renderMarkdown(markdown) {
  const blocks = markdownBlocks(markdown);
  const toc = [];
  const used = new Set();
  const html = blocks
    .map((block) => {
      if (block.type === "h") {
        const level = block.level === 3 ? 3 : 2;
        let id = slugify(block.text) || "kafli";
        if (used.has(id)) {
          let n = 2;
          while (used.has(`${id}-${n}`)) n += 1;
          id = `${id}-${n}`;
        }
        used.add(id);
        if (level === 2) toc.push({ id, text: block.text.replace(/[*_`]/g, "") });
        return `<h${level} id="${id}">${inline(block.text)}</h${level}>`;
      }
      if (block.type === "p") return `<p>${inline(block.text)}</p>`;
      if (block.type === "quote") return `<blockquote><p>${inline(block.text)}</p></blockquote>`;
      if (block.type === "hr") return "<hr>";
      if (block.type === "code") return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
      if (block.type === "list") {
        const items = block.items.map((item) => `<li>${inline(item)}</li>`).join("");
        return `<${block.tag}>${items}</${block.tag}>`;
      }
      return "";
    })
    .join("");
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_\[\]()`]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(words / 200));
  return { html, toc, readingMinutes, words };
}

export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Ógild dagsetning: ${iso}`);
  const day = Number(match[3]);
  const month = MONTHS[Number(match[2]) - 1];
  if (!month || day < 1 || day > 31) throw new Error(`Ógild dagsetning: ${iso}`);
  return `${day}. ${month} ${match[1]}`;
}

function readingLabel(minutes) {
  return `${minutes} mín. lestur`;
}

function crumbsHtml(items) {
  const lis = items
    .map((item, index) => {
      const last = index === items.length - 1;
      if (last) return `<li><span aria-current="page">${escapeHtml(item.name)}</span></li>`;
      return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}</a></li>`;
    })
    .join("");
  return `<nav class="crumbs" aria-label="Brauðmolaslóð"><ol>${lis}</ol></nav>`;
}

function businessNode() {
  return {
    "@type": ["ProfessionalService", "LocalBusiness"],
    name: "Wobo",
    url: `${SITE}/`,
    email: "wobo@wobo.is",
    logo: `${SITE}/logo.png`,
    image: `${SITE}/og.png`,
    priceRange: "89.000–489.000 ISK",
    areaServed: { "@type": "Country", name: "Iceland" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Reykjavík",
      addressCountry: "IS",
    },
  };
}

function breadcrumbNode(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absUrl(item.href),
    })),
  };
}

function faqNode(faq) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function graph(nodes) {
  return { "@context": "https://schema.org", "@graph": [businessNode(), ...nodes] };
}

export function validatePost(data, filename) {
  const missing = ["title", "description", "slug", "date", "author"].filter((key) => !data[key]);
  if (missing.length) throw new Error(`${filename}: vantar ${missing.join(", ")}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    throw new Error(`${filename}: slug má bara vera lágstafir, tölur og bandstrik`);
  }
  formatDate(data.date);
  if (data.updated) formatDate(data.updated);
  if (data.cover && !data.coverAlt) throw new Error(`${filename}: cover þarf coverAlt`);
  if (data.faq && !Array.isArray(data.faq)) throw new Error(`${filename}: faq þarf að vera listi`);
  for (const item of data.faq || []) {
    if (!item.q || !item.a) throw new Error(`${filename}: hvert FAQ þarf q og a`);
  }
}

function coverImg(post) {
  if (!post.cover) return "";
  const width = post.coverWidth ? ` width="${escapeHtml(post.coverWidth)}"` : "";
  const height = post.coverHeight ? ` height="${escapeHtml(post.coverHeight)}"` : "";
  return `<img class="blog-cover" src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.coverAlt)}"${width}${height} decoding="async" fetchpriority="high">`;
}

function tocHtml(toc) {
  if (!toc.length) return "";
  const items = toc
    .map((item) => `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`)
    .join("");
  return `<nav class="blog-toc" aria-label="Efnisyfirlit"><p class="meta">Efnisyfirlit</p><ol>${items}</ol></nav>`;
}

function faqHtml(faq) {
  if (!faq?.length) return "";
  const rows = faq
    .map((item) => `<div><dt>${escapeHtml(item.q)}</dt><dd>${escapeHtml(item.a)}</dd></div>`)
    .join("");
  return `<section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">Algengar spurningar</h2><dl>${rows}</dl></section>`;
}

function ctaHtml() {
  return `<aside class="blog-cta"><h2>Fá tilboð</h2><p>Segðu okkur hvað þig vantar. Við svörum og sendum fast tilboð áður en vinna hefst.</p><a class="button solid" href="/#inquiry">Senda fyrirspurn</a></aside>`;
}

function relatedHtml(related) {
  const items = related.length
    ? related
        .map(
          (post) =>
            `<li><a href="${escapeHtml(post.path)}">${escapeHtml(post.title)}</a></li>`,
        )
        .join("")
    : `<li><a href="/blogg/">Allar greinar</a></li>`;
  const note = related.length ? "" : `<p>Engar aðrar greinar enn.</p>`;
  return `<nav class="related" aria-label="Tengdar greinar"><h2>Fleiri greinar</h2>${note}<ul>${items}</ul></nav>`;
}

function tagsHtml(tags) {
  if (!tags?.length) return "";
  return `<ul class="blog-tags">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>`;
}

export function renderPostInner(post, related) {
  const crumbs = crumbsHtml([
    { name: "Forsíða", href: "/" },
    { name: "Blogg", href: "/blogg/" },
    { name: post.title, href: post.path },
  ]);
  return [
    crumbs,
    `<h1>${escapeHtml(post.title)}</h1>`,
    `<p class="blog-meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> · ${readingLabel(post.readingMinutes)} · ${escapeHtml(post.author)}</p>`,
    tagsHtml(post.tags),
    coverImg(post),
    tocHtml(post.toc),
    `<div class="blog-body">${post.bodyHtml}</div>`,
    ctaHtml(),
    relatedHtml(related),
    faqHtml(post.faq),
  ].join("");
}

export function renderIndexInner(posts) {
  const crumbs = crumbsHtml([
    { name: "Forsíða", href: "/" },
    { name: "Blogg", href: "/blogg/" },
  ]);
  if (!posts.length) {
    return [
      crumbs,
      "<h1>Blogg</h1>",
      '<p class="lede">Hér koma stuttar greinar um vefsíður, verð og kerfi. Engar greinar eru komnar enn.</p>',
      '<div class="blog-empty"><p class="meta">Blogg</p><h2>Greinar koma brátt</h2><p>Hér birtast greinar þegar þær eru tilbúnar. Þangað til geturðu skoðað verðskrána eða sent okkur fyrirspurn.</p><div class="hero-actions"><a class="button solid" href="/#inquiry">Senda fyrirspurn</a><a class="button ghost" href="/verd/">Sjá verð</a></div></div>',
    ].join("");
  }
  const cards = posts
    .map((post) => {
      const cover = post.cover
        ? `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.coverAlt || "")}" loading="lazy" decoding="async">`
        : "";
      return `<li class="blog-card"><a href="${escapeHtml(post.path)}">${cover}<p class="meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time> · ${readingLabel(post.readingMinutes)}</p><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.description)}</p></a></li>`;
    })
    .join("");
  return [
    crumbs,
    "<h1>Blogg</h1>",
    '<p class="lede">Greinar frá Wobo um vefsíður, vefverslanir og kerfi fyrir lítil fyrirtæki.</p>',
    `<ol class="blog-list">${cards}</ol>`,
  ].join("");
}

export function renderMissingInner() {
  return [
    crumbsHtml([
      { name: "Forsíða", href: "/" },
      { name: "Blogg", href: "/blogg/" },
      { name: "Fannst ekki", href: "/blogg/" },
    ]),
    "<h1>Greinin fannst ekki</h1>",
    '<p class="lede">Þessi slóð er ekki til á blogginu.</p>',
    '<div class="hero-actions"><a class="button solid" href="/blogg/">Blogg</a><a class="button ghost" href="/">Forsíða</a></div>',
  ].join("");
}

function relatedPosts(post, posts) {
  return posts
    .filter((other) => other.slug !== post.slug)
    .map((other) => ({
      other,
      score: (other.tags || []).filter((tag) => (post.tags || []).includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || b.other.date.localeCompare(a.other.date))
    .slice(0, 3)
    .map((entry) => entry.other);
}

export function preparePost(raw, posts) {
  const rendered = renderMarkdown(raw.body);
  const post = {
    ...raw,
    tags: raw.tags || [],
    faq: raw.faq || [],
    updated: raw.updated || raw.date,
    path: `/blogg/${raw.slug}/`,
    titleTag: `${raw.title} | Wobo blogg`,
    bodyHtml: rendered.html,
    toc: rendered.toc,
    readingMinutes: rendered.readingMinutes,
    image: raw.cover ? absUrl(raw.cover.startsWith("/") ? raw.cover : `/${raw.cover}`) : `${SITE}/og.png`,
    imageAlt: raw.coverAlt || "Wobo",
  };
  if (raw.cover?.startsWith("http")) post.image = raw.cover;
  else if (raw.cover?.startsWith("/")) post.image = `${SITE}${raw.cover}`;
  const related = relatedPosts(post, posts.map((item) => ({ ...item, path: `/blogg/${item.slug}/` })));
  post.related = related.map((item) => ({
    title: item.title,
    path: `/blogg/${item.slug}/`,
  }));
  post.html = renderPostInner(post, post.related);
  const crumbs = [
    { name: "Forsíða", href: "/" },
    { name: "Blogg", href: "/blogg/" },
    { name: post.title, href: post.path },
  ];
  const nodes = [
    {
      "@type": "WebPage",
      name: post.titleTag,
      url: absUrl(post.path),
      description: post.description,
      inLanguage: "is",
      isPartOf: { "@type": "WebSite", name: "Wobo", url: `${SITE}/` },
    },
    breadcrumbNode(crumbs),
    {
      "@type": ["Article", "BlogPosting"],
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated,
      inLanguage: "is",
      keywords: post.tags.join(", "),
      articleSection: post.tags[0] || "Blogg",
      author: { "@type": "Person", name: post.author },
      publisher: {
        "@type": "Organization",
        name: "Wobo",
        url: `${SITE}/`,
        logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
      },
      image: post.image,
      url: absUrl(post.path),
      mainEntityOfPage: absUrl(post.path),
    },
  ];
  if (post.faq.length) nodes.push(faqNode(post.faq));
  post.jsonld = graph(nodes);
  return post;
}

export function indexPayload(posts, siteIndexable) {
  const indexTitle = "Blogg | Wobo";
  const hasPosts = posts.length > 0;
  const indexDescription = hasPosts
    ? "Greinar frá Wobo um vefsíður, vefverslanir og CRM fyrir lítil fyrirtæki."
    : "Greinar frá Wobo koma brátt. Vefsíðustúdíó í Reykjavík sem smíðar vefsíður, vefverslanir og CRM.";
  let indexRobots = "noindex, nofollow";
  if (siteIndexable) indexRobots = hasPosts ? "index, follow" : "noindex, follow";
  const crumbs = [
    { name: "Forsíða", href: "/" },
    { name: "Blogg", href: "/blogg/" },
  ];
  const nodes = [
    {
      "@type": "WebPage",
      name: indexTitle,
      url: `${SITE}/blogg/`,
      description: indexDescription,
      inLanguage: "is",
      isPartOf: { "@type": "WebSite", name: "Wobo", url: `${SITE}/` },
    },
    breadcrumbNode(crumbs),
  ];
  if (hasPosts) {
    nodes.push({
      "@type": "Blog",
      name: "Wobo blogg",
      url: `${SITE}/blogg/`,
      inLanguage: "is",
      blogPost: posts.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: absUrl(post.path),
        datePublished: post.date,
      })),
    });
  }
  return {
    indexTitle,
    indexDescription,
    indexRobots,
    indexHtml: renderIndexInner(posts),
    indexJsonld: graph(nodes),
    missingHtml: renderMissingInner(),
    missingJsonld: graph([
      {
        "@type": "WebPage",
        name: "Greinin fannst ekki | Wobo",
        url: `${SITE}/blogg/`,
        description: "Þessi grein er ekki á wobo.is.",
      },
      breadcrumbNode([
        { name: "Forsíða", href: "/" },
        { name: "Blogg", href: "/blogg/" },
      ]),
    ]),
  };
}

export function rssDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toUTCString();
}

export function buildFeed(posts) {
  const items = posts
    .map((post) => {
      return [
        "    <item>",
        `      <title>${escapeHtml(post.title)}</title>`,
        `      <link>${absUrl(post.path)}</link>`,
        `      <guid isPermaLink="true">${absUrl(post.path)}</guid>`,
        `      <pubDate>${rssDate(post.date)}</pubDate>`,
        `      <description>${escapeHtml(post.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  const newest = posts[0]?.updated || posts[0]?.date;
  const lastBuild = newest ? `\n    <lastBuildDate>${rssDate(newest)}</lastBuildDate>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Wobo blogg</title>
    <link>${SITE}/blogg/</link>
    <description>Greinar frá Wobo, vefsíðustúdíói í Reykjavík.</description>
    <language>is</language>${lastBuild}
${items}
  </channel>
</rss>
`;
}

export function buildLlms(posts) {
  const postLines = posts.length
    ? posts.map((post) => `- [${post.title}](${absUrl(post.path)}): ${post.description}`).join("\n")
    : "- Engar greinar hafa birst enn. Yfirlitssíðan, https://wobo.is/blogg/, er merkt noindex þar til fyrsta greinin birtist.";
  return `# Wobo

> Wobo er vefsíðustúdíó í Reykjavík. Við smíðum vefsíður, vefverslanir og CRM-kerfi fyrir lítil fyrirtæki. Textinn á síðunni er á íslensku. Verð eru án vsk. Fast tilboð kemur áður en vinna hefst.

Wobo gefur ekki upp heimilisfang skrifstofu og birtir ekki símanúmer. Hægt er að hafa samband með tölvupósti eða í gegnum formið á síðunni.

## Samband

- Netfang: wobo@wobo.is
- Fyrirspurn: https://wobo.is/#hafa-samband
- Staður: Reykjavík, Ísland

## Síður

- [Forsíða](https://wobo.is/): vefsíðustúdíó í Reykjavík. Vefsíður fyrir fyrirtæki. Pakki með vef, CRM og umsjón frá 189.000 kr. Vefsíða ein og sér frá 89.000 kr.
- [Vefsíðugerð](https://wobo.is/vefsidugerd/): almenn síða um umfang og verð vefsíðu, ekki bundin við Reykjavík.
- [Vefsíðugerð í Reykjavík](https://wobo.is/vefsidugerd-reykjavik/): stúdíóið í Reykjavík, samband og verkefnið sem er komið í loftið þar.
- [Vefverslun](https://wobo.is/vefverslun/): vefverslun er hluti af Sérlausn, frá 259.000 kr.
- [Bókunarkerfi](https://wobo.is/bokunarkerfi-og-crm/): tímapantanir og eyðublöð á vefnum. CRM er á sér síðu.
- [CRM-kerfi](https://wobo.is/thjonusta/crm/): listi yfir fyrirspurnir, tilboð og viðskiptavini. HubSpot, Pipedrive, CRM Light eða sérsmíði.
- [Verð](https://wobo.is/verd/): öll verð á einum stað, án vsk.
- [Draumabílar](https://wobo.is/verkefni/draumabilar/): eina verkefnið sem er sýnt opinberlega. Bílasíða, ekki netverslun.
- [Blogg](https://wobo.is/blogg/): greinar. Straumur: https://wobo.is/blogg/feed.xml

## Verð án vsk

Uppgefin verð eru upphafsverð nema annað sé tekið fram. Fast tilboð kemur áður en vinna hefst.

- Wobo Start: frá 89.000 kr. Ein til fimm síður, útlit fyrir síma, sambandsform, grunnur fyrir leitarvélar.
- Wobo Fyrirtæki: frá 189.000 kr. Fleiri síður, verkefni, fyrirspurnaform, uppsetning í Google.
- Sérlausn: frá 259.000 kr. Vefverslun, bókanir, tengingar við önnur kerfi.
- CRM uppsetning: frá 149.000 kr. HubSpot eða Pipedrive.
- CRM Light: frá 290.000 kr.
- Sérsmíðað CRM: frá 360.000 kr.
- Byrjunarpakki: 189.000 kr. og 4.900 kr. á mánuði. Wobo Start, CRM uppsetning og lítil umsjón. Umsjónin er bundin í 12 mánuði.
- Fyrirtækjapakki: 379.000 kr. og 11.900 kr. á mánuði. Wobo Fyrirtæki, CRM Light og umsjón.
- Heildarpakki: frá 489.000 kr. og 24.900 kr. á mánuði. Sérlausn, sérsmíðað CRM og meiri umsjón.
- Umsjón, lítil: 6.900 kr. á mánuði.
- Umsjón: 14.900 kr. á mánuði.
- Umsjón, meiri: 29.900 kr. á mánuði.
- Tímagjald: 16.900 kr. á klukkustund.

Mánaðargjaldið nær yfir hýsingu, uppfærslur og smáar breytingar. Það felur ekki í sér nýja síðu í hverjum mánuði.

## Blogg

${postLines}

## Hvað Wobo gerir ekki

- Birtir ekki sölutölur eða nöfn sem eru ekki á síðunni.
- Tengir ekki nafngreint bókunarkerfi nema það standi í tilboðinu.
- Smíðar ekki tól eða öpp. Þetta er vefsíðustúdíó.
`;
}

export function clientPost(post) {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    path: post.path,
    titleTag: post.titleTag,
    date: post.date,
    image: post.image,
    imageAlt: post.imageAlt,
    html: post.html,
    jsonld: post.jsonld,
  };
}
