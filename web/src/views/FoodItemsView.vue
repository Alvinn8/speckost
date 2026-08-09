<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemType, type FoodItem } from '@/api/types'
import { Button, DataTable, Column, InputText } from 'primevue'
import { useAppToast } from '@/composables/useAppToast'
import { onMounted, ref } from 'vue'

const toast = useAppToast()

const loading = ref(true)
const categories = ref<FoodItem[]>([])
const foodItems = ref<FoodItem[]>([])

onMounted(async () => {
  try {
    categories.value = await foodItemsApi.categories()
    foodItems.value = await foodItemsApi.normal()
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta livsmedel.')
  } finally {
    loading.value = false
  }
})

const newCategoryName = ref('')
const newFoodItemName = ref('')
const creating = ref(false)

async function createNew(type: FoodItemType) {
  creating.value = true
  const name = type === FoodItemType.CATEGORY ? newCategoryName.value : newFoodItemName.value
  try {
    const newItem = await foodItemsApi.create(name, type)
    if (type === FoodItemType.CATEGORY) {
      categories.value.push(newItem)
      newCategoryName.value = ''
    } else {
      foodItems.value.push(newItem)
      newFoodItemName.value = ''
    }
  } catch (error) {
    toast.fromError(error, 'Kunde inte skapa det nya livsmedlet.')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Kategorier</h2>
  <DataTable :value="categories" :loading="loading">
    <Column field="svName" header="Namn">
      <template #body="{ data }">
        <RouterLink :to="`/food-items/${data.id}`">{{ data.svName }}</RouterLink>
      </template>
    </Column>
  </DataTable>
  <InputText v-model="newCategoryName" placeholder="Namn på ny kategori" />
  <Button :loading="creating" @click="createNew(FoodItemType.CATEGORY)" label="Skapa ny kategori" />

  <h2>Livsmedel</h2>
  <DataTable :value="foodItems" :loading="loading">
    <Column field="svName" header="Namn">
      <template #body="{ data }">
        <RouterLink :to="`/food-items/${data.id}`">{{ data.svName }}</RouterLink>
      </template>
    </Column>
  </DataTable>
  <InputText v-model="newFoodItemName" placeholder="Namn på nytt livsmedel" />
  <Button
    :loading="creating"
    @click="createNew(FoodItemType.NORMAL)"
    label="Skapa nytt livsmedel"
  />
</template>
