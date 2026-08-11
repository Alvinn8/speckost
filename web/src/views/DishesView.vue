<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemType, type FoodItem } from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { Button, DataTable, Column, InputText, Tag, useToast } from 'primevue'
import { onMounted, ref } from 'vue'

const toast = useToast()
const allFoodItems = useAllFoodItems()

const loading = ref(true)
const dishes = ref<FoodItem[]>([])

onMounted(async () => {
  try {
    dishes.value = await foodItemsApi.list(FoodItemType.DISH)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch food items' })
    console.error('Error fetching food items:', error)
  } finally {
    loading.value = false
  }
})

const newDishName = ref('')
const creating = ref(false)

async function createNew() {
  creating.value = true
  const name = newDishName.value
  try {
    const newItem = await foodItemsApi.create(name, FoodItemType.DISH)
    allFoodItems.addFoodItem(newItem)
    dishes.value.push(newItem)
    newDishName.value = ''
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create new item' })
    console.error('Error creating new item:', error)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Maträtter</h2>
  <InputText v-model="newDishName" placeholder="Namn på ny maträtt" @keyup.enter="createNew()" />
  <Button :loading="creating" @click="createNew()" label="Skapa ny maträtt" />
  <DataTable :value="dishes" :loading="loading">
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
