<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemType, type FoodItem } from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { Button, DataTable, Column, InputText, Tag, useToast } from 'primevue'
import { onMounted, ref } from 'vue'

const toast = useToast()
const allFoodItems = useAllFoodItems()

const loading = ref(true)
const categories = ref<FoodItem[]>([])
const foodItems = ref<FoodItem[]>([])

onMounted(async () => {
  try {
    categories.value = await foodItemsApi.categories()
    foodItems.value = await foodItemsApi.normal()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch food items' })
    console.error('Error fetching food items:', error)
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
    allFoodItems.addFoodItem(newItem)
    if (type === FoodItemType.CATEGORY) {
      categories.value.push(newItem)
      newCategoryName.value = ''
    } else {
      foodItems.value.push(newItem)
      newFoodItemName.value = ''
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create new item' })
    console.error('Error creating new item:', error)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Kategorier</h2>
  <InputText
    v-model="newCategoryName"
    placeholder="Namn på ny kategori"
    @keyup.enter="createNew(FoodItemType.CATEGORY)"
  />
  <Button :loading="creating" @click="createNew(FoodItemType.CATEGORY)" label="Skapa ny kategori" />
  <DataTable :value="categories" :loading="loading">
    <Column field="svName" header="Namn">
      <template #body="{ data }">
        <RouterLink :to="`/food-items/${data.id}`">{{ data.svName }}</RouterLink>
      </template>
    </Column>
    <Column header="Kategorier">
      <template #body="{ data }: { data: FoodItem }">
        <Tag
          v-for="category in data.categories"
          :key="category.id"
          :value="category.svName"
          :severity="category.optional ? 'warn' : 'danger'"
          style="margin-right: 4px"
        />
      </template>
    </Column>
  </DataTable>

  <h2>Livsmedel</h2>
  <InputText
    v-model="newFoodItemName"
    placeholder="Namn på nytt livsmedel"
    @keyup.enter="createNew(FoodItemType.NORMAL)"
  />
  <Button
    :loading="creating"
    @click="createNew(FoodItemType.NORMAL)"
    label="Skapa nytt livsmedel"
  />
  <DataTable :value="foodItems" :loading="loading">
    <Column field="svName" header="Namn">
      <template #body="{ data }">
        <RouterLink :to="`/food-items/${data.id}`">{{ data.svName }}</RouterLink>
      </template>
    </Column>
    <Column header="Kategorier">
      <template #body="{ data }: { data: FoodItem }">
        <Tag
          v-for="category in data.categories"
          :key="category.id"
          :value="category.svName"
          :severity="category.optional ? 'warn' : 'danger'"
          style="margin-right: 4px"
        />
      </template>
    </Column>
  </DataTable>
</template>
