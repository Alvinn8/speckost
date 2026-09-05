<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import {
  FoodItemRelationType,
  type FoodItemRelation,
  type FoodItemRelationAlternative,
  type FoodItemWithChildren,
} from '@/api/types'
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

const addingAlternativeToRelationId = ref<number | null>(null)
const newAlternativeChildId = ref<number | null>(null)

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

const expandedRows = ref<Record<number, boolean>>({})

watchEffect(() => {
  if (!foodItem.value) {
    expandedRows.value = {}
    return
  }
  expandedRows.value = Object.fromEntries(
    foodItem.value.children.map((relation) => [
      relation.id,
      relation.alternatives.length > 0 || relation.id === addingAlternativeToRelationId.value,
    ]),
  )
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

async function addAlternative() {
  if (
    !foodItem.value ||
    newAlternativeChildId.value === null ||
    addingAlternativeToRelationId.value === null
  )
    return
  adding.value = true
  try {
    await foodItemsApi.addAlternative(
      foodItem.value.id,
      addingAlternativeToRelationId.value,
      newAlternativeChildId.value,
    )
    newAlternativeChildId.value = null
    addingAlternativeToRelationId.value = null
    foodItem.value = await foodItemsApi.get(foodItem.value.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add alternative' })
    console.error('Error adding alternative:', error)
  } finally {
    adding.value = false
  }
}

async function removeAlternative(alternative: FoodItemRelationAlternative) {
  if (!foodItem.value) return
  adding.value = true
  try {
    await foodItemsApi.removeAlternative(foodItem.value.id, alternative.relationId, alternative.id)
    foodItem.value = await foodItemsApi.get(foodItem.value.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove alternative' })
    console.error('Error removing alternative:', error)
  } finally {
    adding.value = false
  }
}

async function onPasteContents(e: ClipboardEvent) {
  e.preventDefault()
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
      <DataTable
        :value="foodItem.children"
        :loading="!foodItem"
        dataKey="id"
        v-model:expandedRows="expandedRows"
      >
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
              icon="pi pi-arrow-right-arrow-left"
              severity="secondary"
              text
              aria-label="Lägg till alternativ"
              @click="addingAlternativeToRelationId = data.id"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              aria-label="Ta bort"
              @click="removeChild(data)"
            />
          </template>
        </Column>
        <template #expansion="{ data }: { data: FoodItemRelation }">
          <div
            v-if="data.alternatives.length > 0 || addingAlternativeToRelationId === data.id"
            style="display: flex"
          >
            <div style="width: 150px">
              <i class="pi pi-arrow-down-right" style="font-size: 35px" />
            </div>
            <div style="margin-bottom: 1.5em">
              <b>Alternativ till {{ data.child.svName }}:</b>
              <DataTable
                :value="data.alternatives"
                :loading="!foodItem"
                dataKey="id"
                size="small"
                responsiveLayout="scroll"
              >
                <Column>
                  <template #body="{ data: alt }: { data: FoodItemRelationAlternative }">
                    <RouterLink :to="`/food-items/${alt.replacementFoodItem.id}`">
                      {{ alt.replacementFoodItem.svName }}
                    </RouterLink>
                  </template>
                </Column>
                <Column>
                  <template #body="{ data: alt }: { data: FoodItemRelationAlternative }">
                    <Tag
                      v-for="category in alt.replacementFoodItem.categories"
                      :key="category.id"
                      :value="category.svName"
                      :severity="category.optional ? 'warn' : 'danger'"
                      style="margin-right: 4px"
                    />
                  </template>
                </Column>
                <Column>
                  <template #body="{ data }: { data: FoodItemRelationAlternative }">
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      size="small"
                      text
                      aria-label="Ta bort"
                      @click="removeAlternative(data)"
                    />
                  </template>
                </Column>
              </DataTable>
              <div style="margin: 1em 0px">
                <Select
                  v-model="newAlternativeChildId"
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
                  label="Lägg till alternativ"
                  :loading="adding"
                  :disabled="newAlternativeChildId === null"
                  @click="addAlternative"
                />
              </div>
            </div>
          </div>
        </template>
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
