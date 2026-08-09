import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import Ripple from 'primevue/ripple'
import ToastService from 'primevue/toastservice'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/food-items', component: { template: '<div />' } },
    ],
  })
  return mount(App, {
    global: {
      plugins: [router, PrimeVue, ToastService, ConfirmationService],
      directives: { ripple: Ripple },
    },
  })
}

describe('App', () => {
  it('renders the brand and the navigation', () => {
    const wrapper = mountApp()
    expect(wrapper.text()).toContain('Speckost')
    expect(wrapper.text()).toContain('Livsmedel')
  })
})
