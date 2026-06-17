import dualmark from '../../../src/module'
import { defineNuxtConfig } from 'nuxt/config'
import type { NuxtConfig } from '@nuxt/schema'

const config: NuxtConfig = defineNuxtConfig({
  modules: [
    dualmark,
  ],
  dualmark: {
    siteUrl: 'https://example.com',
  },
})

export default config
