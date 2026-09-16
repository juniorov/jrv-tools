import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import './apps/cart-wise/style.css'
import './apps/global-exchange/style.css'
import './apps/calc-invoices/style.css'
import './apps/lunar-garden/style.css'
import './apps/spray-mix/style.css'
import './apps/ahorros/style.css'
import './apps/gym-log/style.css'
import './apps/recetas/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

useAuthStore().init()

app.mount('#app')

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Hay una nueva versión de JRV Tools disponible. ¿Actualizar ahora?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.info('JRV Tools está listo para funcionar sin conexión.')
  },
})
