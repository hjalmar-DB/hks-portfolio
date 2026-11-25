# Blogg á wobo.is

Greinar eru Markdown-skrár í `content/blogg/`. Ein skrá er ein grein. `draft: true` er ekki birt.

Eftir að skrá er bætt við eða breytt:

```bash
npm run build
```

Skipunin les Markdown, skrifar `/blogg/` og `/blogg/<slug>/`, uppfærir `sitemap.xml`, `llms.txt` og `/blogg/feed.xml`, og heldur leiðunum í vafranum. Skrárnar sem hún skrifar þarf að committa ef Render keyrir ekki build.

## Skrá

```yaml
---
title: Titill sem verður H1
description: Stutt lýsing fyrir leitarvélar og yfirlit.
slug: slod-greinar
date: 2026-11-25
updated: 2026-11-25
author: Wobo
cover: /blogg/myndir/kapa.webp
coverAlt: Lýsing á mynd
coverWidth: 1400
coverHeight: 800
tags:
  - vefsíðugerð
faq:
  - q: Spurning?
    a: Svar í einni línu.
draft: true
---
```

- `slug` er slóðin: `https://wobo.is/blogg/slod-greinar/`. Bara lágstafir, tölur og bandstrik.
- `date` og `updated` eru `ÁÁÁÁ-MM-DD`. `updated` verður `lastmod` í veftré.
- `draft: true` sleppir greininni úr vef, veftré, straumi og `llms.txt`. Taktu línuna í burtu til að birta.
- `cover` og `coverAlt` fylgjast að. `coverWidth` og `coverHeight` eru valfrjáls og minnka stökk í útliti.
- `faq` er valfrjálst. Ef það er til birtist FAQ-blokk og FAQPage í JSON-LD.

Birt grein: `content/blogg/hvad-kostar-vefsida.md`.

## Efni

Notaðu `##` fyrir kafla. Þeir verða efnisyfirlit. `###` er undirkafli.

- Myndir: `![lýsing](/blogg/myndir/skra.webp)`. Settu skrána í `content/blogg/myndir/`. Build afritar hana á `/blogg/myndir/`. Myndir í meginmáli eru lazy.
- Innri tenglar: `[Verð](/verd/)`.
- Ytri tenglar opnast í nýjum flipa.
- Listar, **feitletrun**, *skáletur* og `kóði` virka. Listar eru flattir, ekki hreiðraðir.

Hver grein fær dagsetningu, lestrartíma, tengdar greinar og kassa sem tengir á fyrirspurnarformið (`/#inquiry`).

## Þegar engin grein er birt

`/blogg/` sýnir „Greinar koma brátt“ og er `noindex`. Síðan fer í veftréð þegar að minnsta kosti ein grein er birt. `/blogg/feed.xml` er alltaf til.

Preview-útgáfan (robots `noindex, nofollow` í bundle) heldur öllu blogginu `noindex`. Live (`index, follow`) vísar í greinar þegar þær eru til.
