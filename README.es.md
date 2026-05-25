# Dualmark

<p align="left">
<a href="https://www.npmjs.com/package/@dualmark/core">
<img src="https://img.shields.io/npm/v/@dualmark/core?label=npm&color=blue" alt="Versión de npm" />
</a>
<a href="https://github.com/dodopayments/dualmark/blob/main/LICENSE">
<img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="Licencia" />
</a>
<a href="https://www.npmjs.com/package/@dualmark/core">
<img src="https://img.shields.io/badge/npm-provenance-blueviolet?logo=npm" alt="Procedencia de npm" />
</a>
<a href="https://discord.gg/bYqAp4ayYh">
<img src="https://img.shields.io/discord/1305511580854779984?label=Join%20Discord&logo=discord" alt="Únete a Discord" />
</a>
</p>

> La infraestructura AEO que le falta a tu sitio de marketing.

Tu blog ocupa el puesto n.º 1 en Google. ChatGPT cita a tu competencia.

Eso no es un problema de contenido. Es un **problema de infraestructura**. Los motores de búsqueda basados ​​en IA (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) leen la web de manera diferente a los humanos: buscan un Markdown limpio, sin elementos de navegación, JavaScript ni banners de cookies. La mayoría de los sitios de marketing les ofrecen una «sopa de HTML» y se preguntan por qué son ignorados.

**Dualmark dota a cada página de un gemelo en Markdown.** La misma URL. Dos formatos. Seleccionados mediante negociación de contenido HTTP. Intégralo en tu pila tecnológica (stack) de Astro, Next.js o Cloudflare en 30 segundos. Verifica su puntuación con `dualmark verify`. ```diff
- npm install @next-seo/some-meta-tag-thing
+ bun add @dualmark/astro
```

[Inicio rápido](#quickstart) · [Por qué](#why-marketing-teams-need-this) · [Ejemplos](./examples) · [Especificación](./spec) · [Documentación](https://dualmark.dev)

---

## Inicio rápido

### Astro (30 segundos)

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
blog: { converter: "blog" },           // /blog/*.md autogenerado
glossary: ​​{ converter: "glossary" },   // /glossary/*.md autogenerado
},
llmsTxt: { enabled: true },              // /llms.txt autogenerado
}),
],
});
```

```bash
bun run build && bunx dualmark verify https://localhost:4321/blog/your-post
# → Puntuación 80/80 ✓
```

Eso es todo. Cada entrada de blog tiene un gemelo en Markdown en `/blog/<slug>.md`. Se genera el archivo `llms.txt`. Cada respuesta HTML anuncia su gemelo mediante el encabezado `Link: <…>; rel="alternate"; type="text/markdown"`. El rastreador de ChatGPT ve un Markdown limpio. Tus páginas existentes no sufren cambios.

### Next.js App Router (60 segundos)

```bash
bun add @dualmark/nextjs
```

```ts
// proxy.ts (o middleware.ts en Next ≤15)
import { createDualmarkMiddleware } from "@dualmark/nextjs";

export default createDualmarkMiddleware({ siteUrl: "https://yourcompany.com" });

``` export const config = {

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

Eso es todo. Los agentes de usuario de los bots reciben Markdown, los navegadores reciben HTML con una cabecera `Link rel="alternate"`, y las URL directas `.md` sirven Markdown. Ejemplo completo con `next dev` → Puntuación de conformidad de 120/125:

[Ejemplo completo de Next.js →](./examples/nextjs-app-router)

### Cloudflare Workers (60 segundos)

Envuelve tu Worker existente. Los bots de IA reciben Markdown en el borde: primer byte en milisegundos desde más de 300 ciudades.

```ts
import { createAEOWorker } from "@dualmark/cloudflare";

import upstream from "./your-existing-worker.js";

export default createAEOWorker({

upstream,

trailingSlash: "never",

analytics: { binding: "AI_AGENT_ANALYTICS" },
});

```

[Ejemplo completo con `wrangler dev` → Puntuación de conformidad 125/125 →](./examples/astro-cloudflare-full)

---

## Por qué los equipos de marketing necesitan esto

Ya invertiste en SEO. Ahora invierte en AEO: **con una fracción del esfuerzo**.

| Problema | Sin Dualmark | Con Dualmark |

|---|---|---|

| **La IA cita a la competencia en lugar de a ti** | Los bots rastrean tu HTML, detectan menús de navegación y errores de JS, y eligen la fuente más limpia | La misma URL sirve Markdown limpio a los bots y HTML pulido a los humanos |
| **No hay forma de saber si eres detectable** | "Esperamos que ChatGPT pueda leer esto" | `dualmark verify` devuelve una puntuación de 0 a 125 con un desglose detallado de los fallos |
| **La propuesta de `llms.txt` cambia constantemente** | Mantenimiento manual; se desincroniza del mapa del sitio | Generación automática a partir de la misma configuración que gestiona tus rutas |
| **Cada equipo reinventa esto** | Middleware personalizado en cada repositorio; ninguno funciona a la perfección | Un único paquete probado en batalla, que se ajusta a un estándar público |
