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
| **Cada equipo reinventa esto** | Middleware personalizado en cada repositorio; ninguno funciona a la perfección | Un único paquete probado en batalla, que se ajusta a un estándar público |Especificación técnica |
| **Sin analíticas para el tráfico de IA** | "¿Fue un bot o un humano?" | Hook `onAIRequest` + integración con Cloudflare Analytics Engine: nombre del bot, proveedor, página, tokens, país |
| **Lento despliegue a través de las páginas** | Marketing espera semanas por ingeniería | Añade `converter: "compare"` a una colección... ¡y listo! 13 conversores incluidos. |

**Desarrollado y probado en batalla en [Dodo Payments](https://dodopayments.com)** para nuestro propio sitio web de marketing. Ahora extraído como software de código abierto (OSS) para que no tengas que escribir una y otra vez la misma lógica de negociación de contenido, detección de bots y envoltura en el Edge.

---

## Lo que realmente despliegas

```
yourcompany.com/pricing             ← los visitantes humanos obtienen esto
yourcompany.com/pricing.md          ← los agentes de IA obtienen esto
yourcompany.com/llms.txt            ← los agentes de IA descubren todo
```

La misma URL. El mismo contenido. Una renderización diferente. Seleccionada automáticamente por:
- Encabezado `Accept: text/markdown` → markdown
- User-Agent de bot de IA conocido (GPTBot, ClaudeBot, PerplexityBot y más de 21 otros) → markdown
- URL directa `.md` → markdown
- Cualquier otra cosa → HTML, con un `Link rel="alternate"` apuntando a su gemelo

Sin penalizaciones por contenido duplicado (el gemelo en markdown establece `X-Robots-Tag: noindex`). Sin reescrituras de frameworks JS. Sin necesidad de volver a capacitar al equipo de contenidos. **Tus páginas existentes permanecen inalteradas.**

---

## Conversores integrados (`@dualmark/converters`)

Generación de markdown lista para usar para los 13 tipos de páginas que tiene todo sitio web de marketing:

| Conversor | Para qué sirve | Ejemplos de marketing |
|---|---|---|
| `blog` | Artículos de formato largo | Blog de ingeniería, historias de clientes |
| `case-study` | Casos de éxito de clientes | Logotipos con estadísticas y citas destacadas |
| `changelog` | Notas de lanzamiento | "Novedades en la v1.4" con cambios agrupados |
| `compare` | Nosotros vs. la competencia | Páginas tipo "Alternativa a Stripe" |
| `docs` | Documentación | Guías de inicio rápido, guías de API |
| `feature` | Páginas de productos/características | "Webhooks", "SSO" — problema/solución + Preguntas frecuentes |
| `glossary` | Definiciones de términos | "¿Qué es una pasarela de pago?" |
| `integration` | Mercado de aplicaciones / integraciones | "Conectar Stripe con Acme", páginas de conectores para Slack |
| `legal` | Páginas de políticas | Términos, Privacidad, DPA |
| `pricing` | Tablas de precios | Comparación de planes con CTA |
| `pseo` | SEO programático | "Servicios de SEO en San Francisco" con datos + enlaces cruzados |
| `tool` | Calculadoras independientes | "Convertidor de divisas" |
| `video` | Páginas de aterrizaje de video | Repeticiones de seminarios web |

Cada convertidor toma tu entrada de la colección → devuelve Markdown limpio con la estructura adecuada para el consumo por IA (título, descripción, rutas de navegación, extracción de preguntas frecuentes, enlaces relacionados). No se requiere ingeniería de *prompts*.

```ts
import { compareConverter } from "@dualmark/converters";

const convert = compareConverter({
siteUrl: "https://yourcompany.com",
basePath: "/compare",
});

const md = convert(yourComparePage); // → diseño de Markdown probado en batalla
```

---

## Verifica cualquier sitio según la especificación

```bash
bunx @dualmark/cli verify https://yourcompany.com/pricing
```

```
Informe de Conformidad de Dualmark
URL:         https://yourcompany.com/pricing
Markdown:    https://yourcompany.com/pricing.md
Puntuación:  125/125
Duración:    107ms

Aprobado:
[+20] md.fetch         — La URL gemela de Markdown es accesible
[+10] md.contentType   — El Content-Type es text/markdown; charset=utf-8
[+10] md.tokensHeader  — El encabezado X-Markdown-Tokens está presente
[+10] md.noindex       — X-Robots-Tag incluye noindex
[+10] md.vary          — El encabezado Vary incluye Accept
[+10] md.body          — El cuerpo contiene Markdown no vacío
[+10] html.linkAlternate — La respuesta HTML anuncia su versión gemela en Markdown
[+10] negotiation.botUa — El User Agent GPTBot recibe text/markdown
[+10] negotiation.acceptHeader — Accept: text/markdown recibe text/markdown
...
```

Tres niveles de conformidad: **Básico** (60%), **Estándar** (80%), **Avanzado** (95%). Incluya la verificación de la puntuación en su CI para evitar regresiones.

```yaml
# .github/workflows/ci.yml
- run: bunx @dualmark/cli verify https://staging.yourcompany.com/pricing
# sale con un código distinto de cero si falla alguna verificación requerida
```

---

## Contenido del paquete

| Paquete | npm | Tamaño | Función |
|---|---|---|---|
| [`@dualmark/core`](./packages/core) | `npm i @dualmark/core` | 14 KB | Primitivas agnósticas a frameworks: negociación de contenido (RFC 7231), detección de bots de IA (24 bots conocidos), constructor de respuestas Markdown, estimación de tokens, utilidades de composición, renderizado de `llms.txt`. Cero dependencias en tiempo de ejecución. |
| [`@dualmark/converters`](./packages/converters) | `npm i @dualmark/converters` | 16 KB | 13 fábricas de convertidores probadas en producción. |
| [`@dualmark/astro`](./packages/astro) | `npm i @dualmark/astro` | 22 KB | Integración con Astro 5. Genera automáticamente endpoints `.md`, incluye middleware y genera `llms.txt`. |
| [`@dualmark/nextjs`](./packages/nextjs) | `npm i @dualmark/nextjs` | 15 KB | Adaptador para el App Router de Next.js. | `withDualmark()`, `createDualmarkMiddleware()`, `createDualmarkRouteHandler()`, `createLlmsTxtHandler()`. |
| [`@dualmark/cloudflare`](./packages/cloudflare) | `npm i @dualmark/cloudflare` | 9 KB | Adaptador de borde para Workers. Envuelve cualquier Worker ascendente. Hooks para análisis.Análisis + telemetría. |

| [`@dualmark/cli`](./packages/cli) | `npm i -g @dualmark/cli` | 16 KB | `dualmark verify <url>`. También API programática. |

Además:

- [**`spec/`**](./spec) — la **Especificación AEO v1.0**. Pública, independiente del framework, compatible con RFC-2119. Implementa en Go, Rust, PHP, Ruby; tú decides.

- [**`apps/docs/`**](./apps/docs) — Sitio de Fumadocs en [dualmark.dev](https://dualmark.dev)
- [**`apps/docs/app/play`**](./apps/docs/app/play) — Probador interactivo de encabezados Accept y agentes de usuario. Disponible en [dualmark.dev/play](https://dualmark.dev/play).

- [**`examples/`**](./examples) — tres ejemplos funcionales de extremo a extremo (Astro, Astro+Cloudflare, Next.js).

--

## Verificación de extremo a extremo

| Superficie | Estado |

|---|---|

| `@dualmark/core` | 174 pruebas superadas (vitest + pruebas de propiedades fast-check) |

| `@dualmark/converters` | 28 pruebas superadas |

| `@dualmark/cloudflare` | 23 pruebas superadas |

| `@dualmark/cli` | 17 pruebas superadas |

| `@dualmark/astro` | 35 pruebas superadas |

| `@dualmark/nextjs` | 47 pruebas superadas |

| `examples/astro-blog` | **80/80** con `astro dev` (`--skip-negotiation`) |

| `examples/astro-cloudflare-full` | **125/125 perfecto** con `wrangler dev` (negociación completa) |

| `examples/nextjs-app-router` | **120/125** con `next dev` (ahora usando `@dualmark/nextjs`) |

| `apps/docs` | 26 rutas prerrenderizadas, todas con código 200 |

| Ruta `/play` | Disponible en dualmark.dev/play, integrada en la aplicación de documentación |

```bash
bun install
bun run build && bun run test && bun run typecheck # 324 pruebas en 6 paquetes
```

---

## Próximos pasos

Nuestro objetivo es que Dualmark se convierta en **la** infraestructura AEO para sitios de marketing, del mismo modo que Tailwind se convirtió en la opción predeterminada para CSS de marketing o Vercel para alojamiento web de marketing. Hoja de ruta:

- **Más adaptadores de frameworks**: SvelteKit, Remix/React Router, Nuxt
- **Más adaptadores de borde**: Vercel, Netlify, Fastly Compute, Deno Deploy
- **Más convertidores**: tablas de precios, registro de cambios, documentación/referencia de API, páginas de estado, integraciones
- **AEO Analytics**: un panel alojado sobre el hook `onAIRequest`, para que el equipo de marketing pueda ver qué bot lee qué página y cuándo
- **Evolución de la especificación hacia AEO 1.1+** con sugerencias de datos estructurados, anclas Markdown por sección y sitemap.md
- **Integraciones con CMS**: plugins de Sanity, Contentful y Builder.io para que usuarios sin conocimientos técnicos puedan crear contenido con doble marcado

Si eres ingeniero de marketing y estás leyendo esto, y alguna de estas funcionalidades se integraría en tu pila tecnológica, [abre una incidencia](https://github.com/dodopayments/dualmark/issues) o [+1 a una existente] [https://github.com/dodopayments/dualmark/issues](https://github.com/dodopayments/dualmark/issues).

--

## Contribuciones

Estamos en las primeras etapas. Se agradecen los informes de errores, las solicitudes de extracción y los reportes de "Lo probé en $framework y falló".

- Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para conocer el ciclo de desarrollo y el flujo de lanzamiento.

- La especificación AEO es la referencia principal; si la implementas en otro lugar (en cualquier lenguaje), queremos enlazar a tu implementación.

```bash
bun install
bun run build # compilación con orquestación turbo
bun run test # vitest en todos los paquetes
bun run typecheck
```

## Licencia

Apache 2.0 — consulta [LICENSE](./LICENSE) y [NOTICE](./NOTICE). Incluye una concesión de patente. Puedes usarla para lo que quieras; se agradece la atribución, pero no es obligatoria.

## Estado

**Pre-1.0.** Las API podrían sufrir cambios en las actualizaciones hasta la versión 1.0. La especificación AEO v1.0 es la versión oficial; el código del framework se basa en ella. Lista para producción para los primeros usuarios; la estamos probando en dodopayments.com.
