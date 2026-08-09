<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemType, type FoodItem } from '@/api/types'
import { Button, DataTable, Column, InputText, useToast, ProgressSpinner } from 'primevue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const toast = useToast()
const route = useRoute()

const foodItem = ref<FoodItem | null>(null)

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    foodItem.value = await foodItemsApi.get(id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch food item' })
    console.error('Error fetching food item:', error)
  }
})
</script>

<template>
  <ProgressSpinner v-if="!foodItem" />
  <div v-else>
    <h2>{{ foodItem.svName }}</h2>
    <p>Type: {{ foodItem.type }}</p>
  </div>
</template>
