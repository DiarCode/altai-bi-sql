import App from '@/App.vue'
import { router } from '@/router'
import '@/styles.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { vueQueryPluginOptions } from '@/core/configs/query-client.config'

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, vueQueryPluginOptions)
app.use(router)

app.mount('#app')
