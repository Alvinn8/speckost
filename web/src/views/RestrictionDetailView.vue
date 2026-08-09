<script setup lang="ts">
import { foodItemsApi, restrictionsApi } from '@/api/client'
import type { FoodItem, RestrictionWithFoodItems } from '@/api/types'
import LinkedItemsPanel from '@/components/LinkedItemsPanel.vue'
import { useAppToast } from '@/composables/useAppToast'
import { ProgressSpinner } from 'primevue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const toast = useAppToast()
const route = useRoute()

const id = Number(route.params.id)

const restriction = ref<RestrictionWithFoodItems | null>(null)
const allFoodItems = ref<FoodItem[]>([])
const saving = ref(false)

onMounted(async () => {
  try {
    ;[restriction.value, allFoodItems.value] = await Promise.all([
      restrictionsApi.get(id),
      foodItemsApi.all(),
    ])
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta restriktionen.')
  }
})

async function addFoodItem(foodItemId: number) {
  saving.value = true
  try {
    const foodItem = await restrictionsApi.addFoodItem(id, foodItemId)
    restriction.value?.foodItems.push(foodItem)
    toast.success(`${foodItem.svName} lades till.`)
  } catch (error) {
    toast.fromError(error, 'Kunde inte lägga till livsmedlet.')
  } finally {
    saving.value = false
  }
}

async function removeFoodItem(foodItem: FoodItem) {
  try {
    await restrictionsApi.removeFoodItem(id, foodItem.id)
    if (restriction.value) {
      restriction.value.foodItems = restriction.value.foodItems.filter(
        (item) => item.id !== foodItem.id,
      )
    }
    toast.success(`${foodItem.svName} togs bort.`)
  } catch (error) {
    toast.fromError(error, 'Kunde inte ta bort livsmedlet.')
  }
}
</script>

<template>
  <ProgressSpinner v-if="!restriction" />
  <div v-else>
    <h2>{{ restriction.svName }}</h2>
    <p>
      Den som har den här restriktionen kan inte äta livsmedlen nedan, och inte heller något
      livsmedel som innehåller dem.
    </p>

    <LinkedItemsPanel
      header="Livsmedel som inte får ätas"
      column-header="Livsmedel"
      :items="restriction.foodItems"
      :options="allFoodItems"
      :label="(foodItem) => foodItem.svName ?? ''"
      :route="(foodItem) => `/food-items/${foodItem.id}`"
      placeholder="Välj livsmedel"
      add-label="Lägg till"
      empty-message="Restriktionen pekar inte ut några livsmedel ännu."
      :busy="saving"
      @add="addFoodItem"
      @remove="removeFoodItem"
    />
  </div>
</template>
