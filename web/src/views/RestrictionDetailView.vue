<script setup lang="ts">
import { restrictionsApi } from '@/api/client'
import { type FoodItem, type RestrictionWithFoodItems } from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import {
  DataTable,
  Column,
  Button,
  Select,
  InputGroup,
  Panel,
  ProgressSpinner,
  useToast,
  InputText,
} from 'primevue'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const toast = useToast()
const route = useRoute()
const allFoodItems = useAllFoodItems()
const id = computed(() => Number(route.params.id))

const loading = ref(false)
const restriction = ref<RestrictionWithFoodItems | null>(null)

const foodItemId = ref<number | null>(null)
const adding = ref(false)

const editingName = ref(false)
const newName = ref('')

onMounted(async () => {
  loading.value = true
  try {
    restriction.value = await restrictionsApi.get(id.value)
    newName.value = restriction.value.svName
  } catch (error) {
    console.error('Error fetching restriction:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch restriction' })
  } finally {
    loading.value = false
  }
})

async function saveNewName() {
  if (!restriction.value) return
  try {
    await restrictionsApi.patch(id.value, newName.value)
    restriction.value.svName = newName.value
    editingName.value = false
  } catch (error) {
    console.error('Error updating restriction name:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update name' })
  }
}

async function addFoodItem() {
  if (foodItemId.value === null) return
  adding.value = true
  try {
    await restrictionsApi.addFoodItem(id.value, foodItemId.value)
    restriction.value = await restrictionsApi.get(id.value)
    foodItemId.value = null
  } catch (error) {
    console.error('Error adding food item to restriction:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add food item' })
  } finally {
    adding.value = false
  }
}

async function removeFoodItem(foodItemIdToRemove: number) {
  try {
    await restrictionsApi.removeFoodItem(id.value, foodItemIdToRemove)
    restriction.value = await restrictionsApi.get(id.value)
  } catch (error) {
    console.error('Error removing food item from restriction:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove food item' })
  }
}
</script>

<template>
  <h2 v-if="!editingName">
    {{ restriction?.svName }}
    <Button icon="pi pi-pencil" severity="secondary" @click="editingName = true" />
  </h2>
  <h2 v-else>
    <InputText v-model="newName" @keyup.enter="saveNewName" @blur="saveNewName" />
    <Button icon="pi pi-check" @click="saveNewName" />
  </h2>
  <ProgressSpinner v-if="loading" />
  <Panel header="Kan inte äta">
    <DataTable :value="restriction?.foodItems">
      <Column field="svName" header="Namn" />
      <Column>
        <template #body="{ data }: { data: FoodItem }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            aria-label="Ta bort"
            @click="removeFoodItem(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <InputGroup>
        <Select
          v-model="foodItemId"
          :options="allFoodItems.value"
          option-label="svName"
          option-value="id"
          placeholder="Välj livsmedel"
          filter
          autoFilterFocus
          show-clear
        />
        <Button
          icon="pi pi-plus"
          label="Lägg till"
          :loading="adding"
          :disabled="foodItemId === null"
          @click="addFoodItem"
        />
      </InputGroup>
    </template>
  </Panel>
</template>
