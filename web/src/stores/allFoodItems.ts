import { ref, computed, onMounted } from 'vue'
import { defineStore } from 'pinia'
import type { FoodItem } from '@/api/types'
import { foodItemsApi } from '@/api/client'
import { useToast } from 'primevue'

export const useAllFoodItems = defineStore('all_food_items', () => {
  const hasFetched = ref(false)
  const allFoodItems = ref<FoodItem[]>([])

  const toast = useToast()

  onMounted(async () => {
    if (hasFetched.value) return
    hasFetched.value = true
    try {
      const items = await foodItemsApi.list()
      allFoodItems.value = items
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch all food items' })
      console.error('Failed to fetch all food items:', error)
    }
  })

  function addFoodItem(item: FoodItem) {
    allFoodItems.value.push(item)
  }

  return { value: allFoodItems, addFoodItem }
})
