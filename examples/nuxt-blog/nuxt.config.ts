export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  telemetry: false,
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@dualmark/nuxt'
  ],
  dualmark: {
    siteUrl: 'https://example.com',
    collections: {
      blog: {
        converter: 'blog',
      }
    }
  }
})
