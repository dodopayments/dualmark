# Dualmark

<p align="left">
<a href="https://www.npmjs.com/package/@dualmark/core">
<img src="https://img.shields.io/npm/v/@dualmark/core?label=npm&color=blue" alt="npm version" />
</a>
<a href="https://github.com/dodopayments/dualmark/blob/main/LICENSE">
<img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="License" />
</a>
<a href="https://www.npmjs.com/package/@dualmark/core">
<img src="https://img.shields.io/badge/npm-provenance-blueviolet?logo=npm" alt="npm provenance" />
</a>
<a href="https://discord.gg/bYqAp4ayYh">
<img src="https://img.shields.io/discord/1305511580854779984?label=Join%20Discord&logo=discord" alt="Join Discord" />
</a>
</p>

> वह AEO इंफ्रास्ट्रक्चर जिसकी आपके मार्केटिंग साइट में कमी है।

आपका ब्लॉग Google पर #1 रैंक करता है। ChatGPT आपके प्रतिस्पर्धी का ज़िक्र करता है।

यह कंटेंट की समस्या नहीं है। यह **इंफ्रास्ट्रक्चर की समस्या** है। AI सर्च इंजन (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) वेब को इंसानों से अलग तरह से पढ़ते हैं — उन्हें बिना किसी नेविगेशन क्रोम, JavaScript, या कुकी बैनर के साफ़-सुथरा Markdown चाहिए होता है। ज़्यादातर मार्केटिंग साइटें उन्हें HTML का ढेर (HTML soup) देती हैं और फिर सोचती हैं कि उन्हें नज़रअंदाज़ क्यों किया जा रहा है।

**Dualmark हर पेज को एक Markdown ट्विन देता है।** वही URL। दो फ़ॉर्मेट। HTTP कंटेंट नेगोशिएशन द्वारा चुने जाते हैं। इसे 30 सेकंड में अपने Astro/Next.js/Cloudflare स्टैक में जोड़ें। `dualmark verify` से इसका स्कोर जाँचें। ```diff
- npm install @next-seo/some-meta-tag-thing
+ bun add @dualmark/astro
```

[Quickstart](#quickstart) · [Why](#why-marketing-teams-need-this) · [Examples](./examples) · [Spec](./spec) · [Docs](https://dualmark.dev)

---

## Quickstart

### Astro (30 सेकंड)

```bash
bun add @dualmark/astro
```

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import dualmark from "@dualmark/astro";

export default defineConfig({
site: "https://yourcompany.com",
integrations: [
dualmark({
siteUrl: "https://yourcompany.com",
collections: {
blog: { converter: "blog" },           // /blog/*.md अपने-आप बन जाएगा
glossary: ​​{ converter: "glossary" },   // /glossary/*.md अपने-आप बन जाएगा
},
llmsTxt: { enabled: true },              // /llms.txt अपने-आप बन जाएगा
}),
],
});
```

```bash
bun run build && bunx dualmark verify https://localhost:4321/blog/your-post
# → Score 80/80 ✓
```

बस इतना ही। हर ब्लॉग पोस्ट का `/blog/<slug>.md` पर एक Markdown ट्विन (जुड़वां) होता है। `llms.txt` बन जाता है। हर HTML रिस्पॉन्स अपने ट्विन का विज्ञापन `Link: <…>; rel="alternate"; type="text/markdown"` के ज़रिए करता है। ChatGPT क्रॉलर को साफ़ Markdown दिखता है। आपके मौजूदा पेज नहीं बदलते।

### Next.js App Router (60 सेकंड)

```bash
bun add @dualmark/nextjs
```

```ts
// proxy.ts (या Next ≤15 पर middleware.ts)
import { createDualmarkMiddleware } from "@dualmark/nextjs";

export default createDualmarkMiddleware({ siteUrl: "https://yourcompany.com" }); export const config = {
matcher: [
{
source: "/((?!_next/|favicon.ico|md/).*)",
missing: [{ type: "header", key: "next-router-prefetch" }],
},

],
};

```

```ts
// app/md/[...path]/route.ts
import { createDualmarkRouteHandler } from "@dualmark/nextjs";
import { POSTS } from "@/lib/posts";

const handler = createDualmarkRouteHandler({
siteUrl: "https://yourcompany.com",
collections: {
blog: { converter: "blog", getEntries: () => POSTS.map(toEntry) },

},
});


export const dynamic = "force-static";

export const GET = handler.GET;

export const generateStaticParams = handler.generateStaticParams;

```

बस इतना ही। बॉट UA को मार्कडाउन मिलता है, ब्राउज़र को `Link rel="alternate"` हेडर के साथ HTML मिलता है, और सीधे `.md` URL मार्कडाउन सर्व करते हैं। `next dev` के साथ पूरा उदाहरण → 120/125 अनुरूपता स्कोर:

[पूरा Next.js उदाहरण →](./examples/nextjs-app-router)

### क्लाउडफ्लेयर वर्कर्स (60 सेकंड)

अपने मौजूदा वर्कर को रैप करें। AI बॉट को एज पर मार्कडाउन मिलता है — 300+ शहरों से सिंगल-डिजिट-मिलीसेकंड फर्स्ट-बाइट।

```ts
import { createAEOWorker } from "@dualmark/cloudflare";

import upstream from "./your-existing-worker.js";

export default createAEOWorker({
upstream,
trailingSlash: "never",
analytics: { binding: "AI_AGENT_ANALYTICS" },
});

```

[`wrangler dev` के साथ पूरा उदाहरण → 125/125 अनुरूपता स्कोर →](./examples/astro-cloudflare-full)

---

## मार्केटिंग टीमों को इसकी आवश्यकता क्यों है

आप पहले ही SEO में निवेश कर चुके हैं। अब AEO में निवेश करें — **बहुत कम मेहनत में**।

| समस्या | Dualmark के बिना | Dualmark के साथ |

|---|---|---|
| **AI आपके बजाय प्रतिस्पर्धियों का हवाला देता है** | बॉट आपके HTML को स्क्रैप करते हैं, नेविगेशन मेनू + JS एरर पाते हैं, और ज़्यादा साफ़ सोर्स चुनते हैं | वही URL बॉट्स को साफ़ Markdown देता है, और इंसानों को बेहतर HTML |
| **यह जानने का कोई तरीका नहीं कि आप खोजे जा सकते हैं या नहीं** | "हमें उम्मीद है कि ChatGPT इसे पढ़ पाएगा" | `dualmark verify` 0–125 का स्कोर देता है, जिसमें लाइन-वाइज़ गलतियाँ भी बताई जाती हैं |
| **`llms.txt` का प्रस्ताव लगातार बदलता रहता है** | इसे हाथ से मैनेज करना पड़ता है, और यह साइटमैप से अलग हो जाता है | यह उसी कॉन्फ़िगरेशन से अपने-आप बनता है, जिससे आपके रूट्स चलते हैं |
| **हर टीम इसे फिर से बनाती है** | हर रेपो में कस्टम मिडलवेयर होता है, लेकिन उनमें से कोई भी पूरी तरह सही नहीं होता | एक आज़माया हुआ पैकेज, जो एक पब्लिश किए गए स्टैंडर्ड के मुताबिक होता है |ic spec |
| **AI ट्रैफ़िक के लिए कोई एनालिटिक्स नहीं** | "क्या वह कोई बॉट था या इंसान?" | `onAIRequest` हुक + Cloudflare Analytics Engine इंटीग्रेशन: बॉट का नाम, वेंडर, पेज, टोकन, देश |
| **पेजों पर लागू होने में देरी** | मार्केटिंग टीम को इंजीनियरिंग टीम का हफ़्तों इंतज़ार करना पड़ता है | किसी कलेक्शन में `converter: "compare"` जोड़ें — बस हो गया। 13 कन्वर्टर पहले से शामिल हैं। |

**[Dodo Payments](https://dodopayments.com) में हमारी अपनी मार्केटिंग साइट के लिए बनाया और परखा गया**। अब इसे OSS (ओपन सोर्स सॉफ़्टवेयर) के तौर पर अलग कर दिया गया है, ताकि आपको बार-बार वही कंटेंट नेगोशिएशन, बॉट डिटेक्शन और एज रैपिंग न लिखनी पड़े।

---

## आप असल में क्या पेश करते हैं

```
yourcompany.com/pricing             ← इंसानी विज़िटर को यह दिखता है
yourcompany.com/pricing.md          ← AI एजेंट को यह दिखता है
yourcompany.com/llms.txt            ← AI एजेंट को सब कुछ पता चल जाता है
```

एक ही URL. एक ही कंटेंट. अलग-अलग रेंडरिंग. अपने-आप चुनी जाती है:
- `Accept: text/markdown` हेडर → markdown
- जाने-पहचाने AI बॉट User-Agent (GPTBot, ClaudeBot, PerplexityBot, +21 और) → markdown
- सीधे `.md` URL से → markdown
- बाकी सब कुछ → HTML, जिसमें `Link rel="alternate"` उसके जुड़वां (twin) की ओर इशारा करता है

कंटेंट डुप्लीकेट होने पर कोई पेनल्टी नहीं (markdown twin `X-Robots-Tag: noindex` सेट करता है)। कोई JS फ़्रेमवर्क दोबारा लिखने की ज़रूरत नहीं। कंटेंट टीम को दोबारा ट्रेनिंग देने की ज़रूरत नहीं। **आपके मौजूदा पेज वैसे के वैसे ही रहेंगे।**

---

## पहले से शामिल कन्वर्टर (`@dualmark/converters`)

हर मार्केटिंग साइट पर मौजूद 13 तरह के पेजों के लिए आसानी से इस्तेमाल होने वाला markdown जनरेशन:

| Converter | यह किसके लिए है | मार्केटिंग के उदाहरण |
|---|---|---|
| `blog` | लंबे लेख | इंजीनियरिंग ब्लॉग, ग्राहकों की कहानियाँ |
| `case-study` | ग्राहकों की सफलताएँ | आँकड़ों और खास कोट (pull-quote) के साथ लोगो |
| `changelog` | रिलीज़ नोट्स | ग्रुप में बाँटे गए बदलावों के साथ "v1.4 में क्या नया है" |
| `compare` | हम बनाम प्रतिस्पर्धी | "Stripe का विकल्प" वाले पेज |
| `docs` | दस्तावेज़ | शुरुआत करने के तरीके, API गाइड |
| `feature` | प्रोडक्ट/फ़ीचर वाले पेज | "Webhooks", "SSO" — समस्या/समाधान + FAQ |
| `glossary` | शब्दों की परिभाषाएँ | "पेमेंट गेटवे क्या है?" |
| `integration` | ऐप मार्केटप्लेस / इंटीग्रेशन | "Stripe को Acme से कनेक्ट करें", Slack कनेक्टर पेज |
| `legal` | पॉलिसी पेज | शर्तें, गोपनीयता, DPA |
| `pricing` | प्राइसिंग टेबल | CTAs के साथ टियर की तुलना |
| `pseo` | प्रोग्रामेटिक SEO | "सैन फ़्रांसिस्को में SEO सेवाएँ" तथ्यों + क्रॉस-लिंक के साथ |
| `tool` | स्टैंडअलोन कैलकुलेटर | "करेंसी कन्वर्टर" |
| `video` | वीडियो लैंडिंग पेज | वेबिनार रीप्ले |

हर कन्वर्टर आपकी कलेक्शन एंट्री लेता है → और AI के इस्तेमाल के लिए सही स्ट्रक्चर वाला साफ़ Markdown देता है (शीर्षक, विवरण, ब्रेडक्रम्ब्स, FAQ एक्सट्रैक्शन, संबंधित लिंक)। किसी प्रॉम्प्ट इंजीनियरिंग की ज़रूरत नहीं है।

```ts
import { compareConverter } from "@dualmark/converters";

const convert = compareConverter({
siteUrl: "https://yourcompany.com",
basePath: "/compare",
});

const md = convert(yourComparePage); // → आज़माया हुआ Markdown लेआउट
```

---

## किसी भी साइट को स्पेसिफिकेशन के हिसाब से वेरिफ़ाई करें

```bash
bunx @dualmark/cli verify https://yourcompany.com/pricing
```

```
Dualmark अनुरूपता रिपोर्ट
URL:         https://yourcompany.com/pricing
Markdown:    https://yourcompany.com/pricing.md
स्कोर:       125/125
अवधि:    107ms

पास हुआ:
[+20] md.fetch         — Markdown ट्विन URL पहुँचा जा सकता है
[+10] md.contentType   — Content-Type text/markdown है; charset=utf-8
[+10] md.tokensHeader  — X-Markdown-Tokens हेडर मौजूद है
[+10] md.noindex       — X-Robots-Tag में noindex शामिल है
[+10] md.vary          — Vary हेडर में Accept शामिल है
[+10] md.body          — Body खाली नहीं है (इसमें markdown है)
[+10] html.linkAlternate — HTML रिस्पॉन्स में markdown ट्विन का विज्ञापन है
[+10] negotiation.botUa — GPTBot UA को text/markdown मिलता है
[+10] negotiation.acceptHeader — Accept: text/markdown को text/markdown मिलता है
...
```
तीन अनुरूपता स्तर — **Basic** (60%), **Standard** (80%), **Advanced** (95%)। गलतियों (regressions) को रोकने के लिए अपने CI में स्कोर की सीमा तय करें।

```yaml
# .github/workflows/ci.yml
- run: bunx @dualmark/cli verify https://staging.yourcompany.com/pricing
# अगर कोई ज़रूरी जाँच फेल हो जाती है, तो यह non-zero कोड के साथ बाहर निकलता है
```

---

## इसमें क्या-क्या है

| Package | npm | Size | यह क्या करता है |
|---|---|---|---|
| [`@dualmark/core`](./packages/core) | `npm i @dualmark/core` | 14 KB | Framework-agnostic primitives: content negotiation (RFC 7231), AI-bot detection (24 जाने-पहचाने bots), markdown response builder, token estimation, composition helpers, `llms.txt` रेंडरिंग। कोई runtime deps नहीं। |
| [`@dualmark/converters`](./packages/converters) | `npm i @dualmark/converters` | 16 KB | 13 production-tested converter factories। |
| [`@dualmark/astro`](./packages/astro) | `npm i @dualmark/astro` | 22 KB | Astro 5 इंटीग्रेशन। अपने-आप `.md` endpoints बनाता है, middleware देता है, `llms.txt` बनाता है। |
| [`@dualmark/nextjs`](./packages/nextjs) | `npm i @dualmark/nextjs` | 15 KB | Next.js App Router adapter। | `withDualmark()`, `createDualmarkMiddleware()`, `createDualmarkRouteHandler()`, `createLlmsTxtHandler()`. |
| [`@dualmark/cloudflare`](./packages/cloudflare) | `npm i @dualmark/cloudflare` | 9 KB | Workers edge adapter. किसी भी अपस्ट्रीम Worker को रैप करता है। एनालिटिक्स के लिए हुक्स।ytics + टेलीमेट्री। |
| [`@dualmark/cli`](./packages/cli) | `npm i -g @dualmark/cli` | 16 KB | `dualmark verify <url>`. प्रोग्रामेटिक API भी। |

प्लस:

- [**`spec/`**](./spec) — **AEO स्पेसिफिकेशन v1.0**। पब्लिक, फ्रेमवर्क-एग्नोस्टिक, RFC-2119-कम्प्लायंट। इसे Go, Rust, PHP, Ruby में इम्प्लीमेंट करें — आपकी मर्ज़ी।
- [**`apps/docs/`**](./apps/docs) — Fumadocs साइट [dualmark.dev](https://dualmark.dev) पर
- [**`apps/docs/app/play`**](./apps/docs/app/play) — इंटरैक्टिव एक्सेप्ट-हेडर + UA टेस्टर। [dualmark.dev/play](https://dualmark.dev/play) पर लाइव।
- [**`examples/`**](./examples) — तीन एंड-टू-एंड वर्किंग उदाहरण (Astro, Astro+Cloudflare, Next.js)।

---

## एंड-टू-एंड वेरिफाइड

| सरफेस | स्टेटस |
|---|---|
| `@dualmark/core` | 174 टेस्ट पास (vitest + fast-check प्रॉपर्टी टेस्ट) |
| `@dualmark/converters` | 28 टेस्ट पास |
| `@dualmark/cloudflare` | 23 टेस्ट पास |
| `@dualmark/cli` | 17 टेस्ट पास |
| `@dualmark/astro` | 35 टेस्ट पास |
| `@dualmark/nextjs` | 47 टेस्ट पास |
| `examples/astro-blog` | **80/80** `astro dev` (`--skip-negotiation`) के अंदर |
| `examples/astro-cloudflare-full` | **125/125 perfect** `wrangler dev` (full negotiation) के अंदर |
| `examples/nextjs-app-router` | **120/125** `next dev` के अंदर (अब `@dualmark/nextjs` का इस्तेमाल कर रहा है) |
| `apps/docs` | 26 रूट पहले से रेंडर किए गए हैं, सभी 200 को सर्व करते हैं |
| `/play` रूट | dualmark.dev/play पर लाइव, डॉक्स ऐप में इंटीग्रेटेड |

```bash
bun install
bun run build && bun run test && bun run typecheck # 6 पैकेज में 324 टेस्ट
```

---

## यहाँ से आगे क्या होगा

हम डुअलमार्क को मार्केटिंग साइट्स के लिए **द** AEO इंफ्रास्ट्रक्चर बनाने की दिशा में काम कर रहे हैं — ठीक वैसे ही जैसे टेलविंड मार्केटिंग CSS के लिए डिफ़ॉल्ट बन गया या वर्सेल मार्केटिंग होस्टिंग के लिए। रोडमैप:

- **और फ्रेमवर्क एडॉप्टर**: SvelteKit, Remix/React Router, Nuxt
- **और एज एडॉप्टर**: Vercel, Netlify, Fastly Compute, Deno Deploy
- **और कन्वर्टर**: प्राइसिंग टेबल, चेंजलॉग, डॉक्स/API रेफरेंस, स्टेटस पेज, इंटीग्रेशन
- **AEO Analytics**: `onAIRequest` हुक के ऊपर एक होस्टेड डैशबोर्ड, ताकि मार्केटिंग देख सके कि कौन सा बॉट कौन सा पेज कब पढ़ता है
- **स्ट्रक्चर्ड डेटा हिंट, पर-सेक्शन मार्कडाउन एंकर और sitemap.md के साथ AEO 1.1+ की ओर स्पेक इवोल्यूशन**
- **CMS इंटीग्रेशन**: Sanity, Contentful, Builder.io प्लगइन्स ताकि नॉन-इंजीनियर डुअल-मार्क्ड कंटेंट लिख सकें

अगर आप एक मार्केटिंग इंजीनियर हैं और यह पढ़ रहे हैं और इनमें से कोई भी आपके स्टैक में आता है, तो [एक खोलें इश्यू](https://github.com/dodopayments/dualmark/issues) या [+1 मौजूदा वाला](https://github.com/dodopayments/dualmark/issues).

---

## कंट्रीब्यूटिंग

हम जल्दी आ गए हैं। इश्यू, PRs, और "मैंने इसे $framework पर ट्राई किया और यह टूट गया" रिपोर्ट सभी का स्वागत है।

- डेव लूप और रिलीज़ फ़्लो के लिए [CONTRIBUTING.md](./CONTRIBUTING.md) पढ़ें।
- AEO Spec ऑथेंटिक है — अगर आप इसे कहीं और (किसी भी भाषा में) इम्प्लीमेंट करते हैं, तो हम आपके इम्प्लीमेंटेशन से लिंक करना चाहते हैं।

```bash
bun install
bun run build # turbo-orchestrated build
bun run test # vitest सभी पैकेज में
bun run typecheck
```

## लाइसेंस

Apache 2.0 — [LICENSE](./LICENSE) और [NOTICE](./NOTICE) देखें। इसमें पेटेंट ग्रांट शामिल है। इसे किसी भी चीज़ के लिए इस्तेमाल करें; एट्रिब्यूशन की तारीफ़ की जाएगी, कभी ज़रूरी नहीं होगा।

## स्टेटस

**1.0 से पहले।** API पैच रिलीज़ में 1.0 तक बदल सकते हैं। AEO Spec v1.0 ऑथेंटिक है; फ्रेमवर्क कोड नीचे दिया गया है। जल्दी अपनाने वालों के लिए प्रोडक्शन-रेडी; हम इसे [dodopayments.com पर चला रहे हैं](https://dodopayments.com)।