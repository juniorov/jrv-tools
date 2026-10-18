import { defineStore } from 'pinia'
import { apps } from '@/shared/apps.registry'

const STORAGE_KEY = 'jrv_tools_enabled_apps_v1'

function loadEnabledSlugs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved)) return apps.map((app) => app.slug)

    const knownSlugs = new Set(apps.map((app) => app.slug))
    return saved.filter((slug) => knownSlugs.has(slug))
  } catch {
    return apps.map((app) => app.slug)
  }
}

export const useAppsStore = defineStore('apps', {
  state: () => ({
    enabledSlugs: loadEnabledSlugs(),
  }),
  getters: {
    enabledApps: (state) => apps.filter((app) => state.enabledSlugs.includes(app.slug)),
    isEnabled: (state) => (slug) => state.enabledSlugs.includes(slug),
  },
  actions: {
    toggleApp(slug) {
      if (this.enabledSlugs.includes(slug)) {
        this.enabledSlugs = this.enabledSlugs.filter((item) => item !== slug)
      } else {
        this.enabledSlugs = [...this.enabledSlugs, slug]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.enabledSlugs))
    },
    enableAll() {
      this.enabledSlugs = apps.map((app) => app.slug)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.enabledSlugs))
    },
  },
})

