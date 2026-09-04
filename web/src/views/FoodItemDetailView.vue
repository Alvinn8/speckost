<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import { FoodItemRelationType, type FoodItemRelation, type FoodItemWithChildren } from '@/api/types'
import ParseContentsResult from '@/components/ParseContentsResult.vue'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { parseContents, type ParseResult } from '@/util/parseContents'
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
  InputText,
  Textarea,
  Dialog,
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
const editingDescription = ref(false)
const newDescription = ref('')

const newChildId = ref<number | null>(null)
const newRelationType = ref<FoodItemRelationType>(FoodItemRelationType.CONTAINS)
const adding = ref(false)

const selectableFoodItems = computed(() =>
  allFoodItems.value.filter((item) => item.id !== id.value),
)

const parsedContents = ref<ParseResult | null>(null)

const relationTypeLabels: Record<FoodItemRelationType, string> = {
  [FoodItemRelationType.CONTAINS]: 'Innehåller',
  [FoodItemRelationType.IS_A]: 'Är',
}

const relationTypeOptions = Object.values(FoodItemRelationType).map((value) => ({
  value,
  label: relationTypeLabels[value],
}))

const typeOptions = [
  { value: 'CATEGORY', label: 'Kategori (CATEGORY)' },
  { value: 'NORMAL', label: 'Livsmedel (NORMAL)' },
  { value: 'DISH', label: 'Maträtt (DISH)' },
]

watchEffect(async () => {
  try {
    foodItem.value = await foodItemsApi.get(id.value)
    newName.value = foodItem.value.svName
    newDescription.value = foodItem.value.svDescription ?? ''
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

async function saveNewType() {
  if (!foodItem.value) return
  try {
    const updatedItem = await foodItemsApi.patch(foodItem.value.id, { type: foodItem.value.type })
    foodItem.value.type = updatedItem.type
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update type' })
    console.error('Error updating type:', error)
  }
}

async function saveNewDescription() {
  if (!foodItem.value) return
  try {
    const updatedItem = await foodItemsApi.patch(foodItem.value.id, {
      svDescription: newDescription.value,
    })
    foodItem.value.svDescription = updatedItem.svDescription
    editingDescription.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update description' })
    console.error('Error updating description:', error)
  }
}

async function removeChild(relation: FoodItemRelation) {
  if (!foodItem.value) return
  try {
    await foodItemsApi.removeChild(foodItem.value.id, relation.id)
    foodItem.value = await foodItemsApi.get(foodItem.value.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove child' })
    console.error('Error removing child:', error)
  }
}

async function addChild() {
  if (!foodItem.value || newChildId.value === null) return
  adding.value = true
  try {
    await foodItemsApi.addChild(foodItem.value.id, newChildId.value, newRelationType.value, false)
    newChildId.value = null
    foodItem.value = await foodItemsApi.get(foodItem.value.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add child' })
    console.error('Error adding child:', error)
  } finally {
    adding.value = false
  }
}

async function onPasteContents(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain')
  if (!text) return
  parsedContents.value = parseContents(text, allFoodItems.value)
}

async function addChildrenFromParsedContents(foodItemIds: number[]) {
  if (!foodItem.value) return
  adding.value = true
  try {
    await foodItemsApi.addChildrenBulk(
      foodItem.value.id,
      foodItemIds,
      FoodItemRelationType.CONTAINS,
      false,
    )
    parsedContents.value = null
    foodItem.value = await foodItemsApi.get(foodItem.value.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add children' })
    console.error('Error adding children:', error)
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
    <p v-if="!editingDescription">
      <template v-if="foodItem.svDescription">
        {{ foodItem.svDescription }}
        <Button icon="pi pi-pencil" severity="secondary" @click="editingDescription = true" />
      </template>
      <Button
        v-else
        severity="secondary"
        label="Lägg till beskrivning"
        @click="editingDescription = true"
      />
    </p>
    <InputGroup v-else>
      <Textarea
        v-model="newDescription"
        size="large"
        fluid
        @keyup.enter="saveNewDescription"
        @blur="saveNewDescription"
      />
      <Button icon="pi pi-check" @click="saveNewDescription" />
    </InputGroup>
    <div style="margin-bottom: 1em">
      <span>Typ: </span>
      <Select
        v-model="foodItem.type"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        @change="saveNewType"
      />
    </div>
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
        <Column>
          <template #body="{ data }: { data: FoodItemRelation }">
            <Tag
              v-for="category in data.child.categories"
              :key="category.id"
              :value="category.svName"
              :severity="category.optional ? 'warn' : 'danger'"
              style="margin-right: 4px"
            />
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
        <b style="display: block; padding: 1em 0px">Lägg till</b>
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
          <Button
            icon="pi pi-plus"
            label="Lägg till"
            :loading="adding"
            :disabled="newChildId === null"
            @click="addChild"
          />
        </InputGroup>
        <em style="display: block; padding: 1em 0px">eller</em>
        <InputText
          value=""
          @paste="onPasteContents"
          placeholder="Klistra in innehållsförteckning här"
          fluid
        />
      </template>
    </Panel>
    <Dialog
      :visible="parsedContents !== null"
      header="Matcha innehållsförteckning"
      :modal="true"
      :closable="true"
      :dismissableMask="true"
      @update:visible="
        (val) => {
          if (!val) parsedContents = null
        }
      "
    >
      <ParseContentsResult
        v-if="parsedContents"
        :parseResults="parsedContents"
        @cancel="parsedContents = null"
        @add="addChildrenFromParsedContents"
      />
    </Dialog>
  </div>
</template>
