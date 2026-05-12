<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.post.title}</title>
  <meta name="description" content={data.post.description} />
</svelte:head>

<main>
  <a class="back" href="/">Back to all posts</a>
  <article>
    <p class="eyebrow">{data.post.category}</p>
    <h1>{data.post.title}</h1>
    <p class="description">{data.post.description}</p>
    <p class="meta">
      By {data.post.author} on {new Date(data.post.publishedDate).toLocaleDateString("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      })}
    </p>
    {#each data.post.body.split("\n\n") as paragraph}
      <p>{paragraph}</p>
    {/each}
  </article>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #172033;
    background: #f6f3ed;
  }

  main {
    width: min(760px, calc(100% - 40px));
    margin: 0 auto;
    padding: 56px 0;
  }

  .back {
    color: #153f7a;
    font-weight: 700;
  }

  article {
    margin-top: 32px;
    padding: 32px;
    border: 1px solid #ded4c2;
    border-radius: 24px;
    background: #fffaf1;
  }

  .eyebrow {
    color: #7a4f18;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 680px;
    font-size: clamp(2rem, 6vw, 4rem);
    line-height: 0.98;
    margin: 0 0 18px;
  }

  .description {
    font-size: 1.2rem;
    color: #4e5869;
  }

  .meta {
    color: #6e7480;
  }
</style>
