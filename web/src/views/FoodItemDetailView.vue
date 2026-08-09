<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemRelationType, type FoodItemRelation, type FoodItemWithChildren } from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import {
  Button,
  DataTable,
  Column,
  Tag,
  useToast,
  ProgressSpinner,
  Panel,
  InputGroup,
  Select,
  ToggleButton,
  InputText,
} from 'primevue'
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

const toast = useToast()
const route = useRoute()
const allFoodItems = useAllFoodItems()

const id = computed(() => Number(route.params.id))
const foodItem = ref<FoodItemWithChildren | null>(null)

const editingName = ref(false)
const newName = ref('')

const newChildId = ref<number | null>(null)
const newRelationType = ref<FoodItemRelationType>(FoodItemRelationType.CONTAINS)
const newOptional = ref(false)
const adding = ref(false)

const selectableFoodItems = computed(() =>
  allFoodItems.value.filter((item) => item.id !== id.value),
)

const relationTypeLabels: Record<FoodItemRelationType, string> = {
  [FoodItemRelationType.CONTAINS]: 'Innehåller',
  [FoodItemRelationType.IS_A]: 'Är',
}

const relationTypeOptions = Object.values(FoodItemRelationType).map((value) => ({
  value,
  label: relationTypeLabels[value],
}))

watchEffect(async () => {
  try {
    foodItem.value = await foodItemsApi.get(id.value)
    newName.value = foodItem.value.svName
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch food item' })
    console.error('Error fetching food item:', error)
  }
})

async function saveNewName() {
  if (!foodItem.value) return
  try {
    const updatedItem = await foodItemsApi.patch(foodItem.value.id, { svName: newName.value })
    foodItem.value.svName = updatedItem.svName
    editingName.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update name' })
    console.error('Error updating name:', error)
  }
}

async function removeChild(relation: FoodItemRelation) {
  if (!foodItem.value) return
  try {
    await foodItemsApi.removeChild(foodItem.value.id, relation.id)
    foodItem.value.children = foodItem.value.children.filter((child) => child.id !== relation.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove child' })
    console.error('Error removing child:', error)
  }
}

async function addChild() {
  if (!foodItem.value || newChildId.value === null) return
  adding.value = true
  try {
    const newRelation = await foodItemsApi.addChild(
      foodItem.value.id,
      newChildId.value,
      newRelationType.value,
      newOptional.value,
    )
    foodItem.value.children.push(newRelation)
    newChildId.value = null
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add child' })
    console.error('Error adding child:', error)
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <ProgressSpinner v-if="!foodItem" />
  <div v-else>
    <h2 v-if="!editingName">
      {{ foodItem.svName }}
      <Button icon="pi pi-pencil" severity="secondary" @click="editingName = true" />
    </h2>
    <template v-else>
      <InputText v-model="newName" @keyup.enter="saveNewName" @blur="saveNewName" />
      <Button icon="pi pi-check" @click="saveNewName" />
    </template>
    <p>Type: {{ foodItem.type }}</p>
    <div style="margin-bottom: 1em">
      <Tag
        v-for="category in foodItem.categories"
        :key="category.id"
        :value="category.svName"
        :severity="category.optional ? 'warn' : 'danger'"
        style="margin-right: 4px"
      />
    </div>
    <Panel>
      <DataTable :value="foodItem.children" :loading="!foodItem">
        <template #empty>Det här livsmedlet har inget innehåll registrerat.</template>
        <Column :headerStyle="{ width: '150px' }">
          <template #body="{ data }: { data: FoodItemRelation }">
            {{ relationTypeLabels[data.relationType] }}
          </template>
        </Column>
        <Column>
          <template #body="{ data }: { data: FoodItemRelation }">
            <RouterLink :to="`/food-items/${data.child.id}`">{{ data.child.svName }}</RouterLink>
          </template>
        </Column>
        <Column field="optional">
          <template #body="{ data }: { data: FoodItemRelation }">
            <Tag v-if="data.optional" :value="'Valfri'" severity="warn" />
          </template>
        </Column>
        <Column>
          <template #body="{ data }: { data: FoodItemRelation }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              aria-label="Ta bort"
              @click="removeChild(data)"
            />
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <InputGroup>
          <Select
            v-model="newRelationType"
            :options="relationTypeOptions"
            option-label="label"
            option-value="value"
            style="flex: 0 1 150px"
          />
          <Select
            v-model="newChildId"
            :options="selectableFoodItems"
            option-label="svName"
            option-value="id"
            placeholder="Välj livsmedel"
            filter
            autoFilterFocus
            show-clear
          />
          <ToggleButton v-model="newOptional" on-label="Valfri" off-label="Obligatorisk" />
          <Button
            icon="pi pi-plus"
            label="Lägg till"
            :loading="adding"
            :disabled="newChildId === null"
            @click="addChild"
          />
        </InputGroup>
      </template>
    </Panel>
  </div>
</template>
