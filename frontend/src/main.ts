import App from '@/App.vue'
import { router } from '@/router'
import '@/styles.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'

import { vueQueryPluginOptions } from '@/core/configs/query-client.config'

const app = createApp(App)

const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(VueQueryPlugin, vueQueryPluginOptions)
app.use(pinia)

app.use(router)

app.mount('#app')
