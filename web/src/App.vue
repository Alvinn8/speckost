<script setup lang="ts">
import { ConfirmDialog, Menubar, Toast } from 'primevue'
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { label: 'Livsmedel', icon: 'pi pi-sitemap', route: '/food-items' },
  { label: 'Matpreferenser / Allergier', icon: 'pi pi-palette', route: '/restrictions' },
  { label: 'Maträtter', icon: 'pi pi-receipt', route: '/dishes' },
  { label: 'Personer', icon: 'pi pi-users', route: '/people' },
  { label: 'Vem kan äta?', icon: 'pi pi-check-square', route: '/check' },
]

const menuItems = computed(() =>
  items.map((item) => ({
    ...item,
    class: route.path.startsWith(item.route) ? 'p-menubar-item-active' : '',
  })),
)
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <Menubar :model="menuItems">
    <template #start>
      <RouterLink to="/" style="font-weight: 700; color: black; text-decoration: none">
        <span>Speckost</span>
      </RouterLink>
    </template>
    <template #item="{ item, props }">
      <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
        <a :href="href" v-bind="props.action" @click="navigate">
          <span :class="item.icon" />
          <span>{{ item.label }}</span>
        </a>
      </RouterLink>
    </template>
  </Menubar>
  <main style="max-width: 1100px; margin: 0 auto; padding: 1.5rem">
    <RouterView />
  </main>
</template>

<style>
body {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
