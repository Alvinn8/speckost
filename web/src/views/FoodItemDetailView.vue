<script setup lang="ts">
import { foodItemsApi } from '@/api/client'
import {
  FoodItemRelationType,
  type FoodItem,
  type FoodItemRelation,
  type FoodItemWithChildren,
} from '@/api/types'
import {
  Button,
  Column,
  DataTable,
  InputGroup,
  Panel,
  ProgressSpinner,
  Select,
  Tag,
  ToggleButton,
  useConfirm,
} from 'primevue'
import { useAppToast } from '@/composables/useAppToast'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const toast = useAppToast()
const confirm = useConfirm()
const route = useRoute()

const id = Number(route.params.id)

const foodItem = ref<FoodItemWithChildren | null>(null)
const allFoodItems = ref<FoodItem[]>([])

const relationTypeLabels: Record<FoodItemRelationType, string> = {
  [FoodItemRelationType.CONTAINS]: 'Innehåller',
  [FoodItemRelationType.IS_A]: 'Är en',
}

const relationTypeOptions = Object.values(FoodItemRelationType).map((value) => ({
  value,
  label: relationTypeLabels[value],
}))

const newChildId = ref<number | null>(null)
const newRelationType = ref<FoodItemRelationType>(FoodItemRelationType.CONTAINS)
const newOptional = ref(false)
const adding = ref(false)

const selectableFoodItems = computed(() => allFoodItems.value.filter((item) => item.id !== id))

onMounted(async () => {
  try {
    ;[foodItem.value, allFoodItems.value] = await Promise.all([
      foodItemsApi.get(id),
      foodItemsApi.all(),
    ])
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta livsmedlet.')
  }
})

async function addChild() {
  if (newChildId.value === null) {
    toast.warn('Välj ett livsmedel att lägga till.')
    return
  }
  adding.value = true
  try {
    const relation = await foodItemsApi.addChild(
      id,
      newChildId.value,
      newRelationType.value,
      newOptional.value,
    )
    foodItem.value?.children.push(relation)
    newChildId.value = null
    newOptional.value = false
    toast.success(`Relationen till ${relation.child.svName} lades till.`)
  } catch (error) {
    toast.fromError(error, 'Kunde inte lägga till relationen.')
  } finally {
    adding.value = false
  }
}

function confirmRemoveChild(relation: FoodItemRelation) {
  confirm.require({
    header: 'Ta bort relation',
    message: `Vill du ta bort relationen till ${relation.child.svName}?`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Avbryt', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Ta bort', severity: 'danger' },
    accept: () => removeChild(relation),
  })
}

async function removeChild(relation: FoodItemRelation) {
  try {
    await foodItemsApi.removeChild(id, relation.id)
    if (foodItem.value) {
      foodItem.value.children = foodItem.value.children.filter((it) => it.id !== relation.id)
    }
    toast.success(`Relationen till ${relation.child.svName} togs bort.`)
  } catch (error) {
    toast.fromError(error, 'Kunde inte ta bort relationen.')
  }
}
</script>

<template>
  <ProgressSpinner v-if="!foodItem" />
  <div v-else>
    <h2>{{ foodItem.svName }}</h2>
    <p>Type: {{ foodItem.type }}</p>

    <Panel header="Relationer">
      <DataTable :value="foodItem.children">
        <template #empty>Det här livsmedlet har inga relationer ännu.</template>
        <Column header="Relation">
          <template #body="{ data }: { data: FoodItemRelation }">
            {{ relationTypeLabels[data.relationType] }}
          </template>
        </Column>
        <Column header="Livsmedel">
          <template #body="{ data }: { data: FoodItemRelation }">
            <RouterLink :to="`/food-items/${data.child.id}`">{{ data.child.svName }}</RouterLink>
          </template>
        </Column>
        <Column header="Valfri">
          <template #body="{ data }: { data: FoodItemRelation }">
            <Tag
              :value="data.optional ? 'Valfri' : 'Obligatorisk'"
              :severity="data.optional ? 'warn' : 'success'"
            />
          </template>
        </Column>
        <Column>
          <template #body="{ data }: { data: FoodItemRelation }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              aria-label="Ta bort relation"
              @click="confirmRemoveChild(data)"
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
          />
          <Select
            v-model="newChildId"
            :options="selectableFoodItems"
            option-label="svName"
            option-value="id"
            placeholder="Välj livsmedel"
            filter
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
