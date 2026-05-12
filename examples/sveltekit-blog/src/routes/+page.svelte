<script lang="ts">
  import { POSTS } from "$lib/posts";
</script>

<svelte:head>
  <title>Dualmark SvelteKit Example</title>
  <meta
    name="description"
    content="Reference implementation of Dualmark on SvelteKit."
  />
</svelte:head>

<main>
  <p class="eyebrow">Dualmark example</p>
  <h1>SvelteKit pages with markdown twins</h1>
  <p>
    This app serves normal HTML pages for users and generated markdown endpoints
    for answer engines.
  </p>

  <section>
    <h2>Posts</h2>
    <ul>
      {#each POSTS as post}
        <li>
          <a href={`/posts/${post.slug}`}>{post.title}</a>
          <p>{post.description}</p>
        </li>
      {/each}
    </ul>
  </section>
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
    padding: 72px 0;
  }

  .eyebrow {
    color: #7a4f18;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 680px;
    font-size: clamp(2.4rem, 7vw, 4.6rem);
    line-height: 0.94;
    margin: 0 0 24px;
  }

  h2 {
    margin-top: 48px;
  }

  ul {
    display: grid;
    gap: 16px;
    list-style: none;
    padding: 0;
  }

  li {
    padding: 20px;
    border: 1px solid #ded4c2;
    border-radius: 18px;
    background: #fffaf1;
  }

  a {
    color: #153f7a;
    font-weight: 700;
  }
</style>
