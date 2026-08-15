<script setup lang="ts">
import { compatibilityApi, peopleApi } from '@/api/client'
import type {
  GroupCompatibilityResult,
  PersonWithRestrictions,
  Verdict,
  CompatibilityHit,
} from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { useAllRestrictions } from '@/stores/allRestrictions'
import { DataTable, Column, useToast, MultiSelect, Tag, Checkbox } from 'primevue'
import { computed, onMounted, ref, watchEffect } from 'vue'

const toast = useToast()
const allFoodItems = useAllFoodItems()
const allRestrictions = useAllRestrictions()
const allPeople = ref<PersonWithRestrictions[]>([])

const selectedFoodItems = ref<number[]>([])
const selectedPeople = ref<number[]>([])

const dishes = computed(() => allFoodItems.value.filter((item) => item.type === 'DISH'))

const compatibilityResult = ref<GroupCompatibilityResult | null>(null)
const loading = ref(false)

onMounted(async () => {
  try {
    allPeople.value = await peopleApi.list()
    selectedPeople.value = allPeople.value.map((p) => p.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  }
})

watchEffect(async () => {
  if (selectedFoodItems.value.length === 0 || selectedPeople.value.length === 0) {
    compatibilityResult.value = null
    return
  }

  loading.value = true
  try {
    compatibilityResult.value = await compatibilityApi.check(
      selectedPeople.value,
      selectedFoodItems.value,
    )
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  } finally {
    loading.value = false
  }
})

const hideCompatibleRows = ref(true)

const tableRows = computed<TableRowData[]>(() => {
  if (!compatibilityResult.value) return []

  return compatibilityResult.value
    .flatMap((result) => {
      const person = allPeople.value.find((p) => p.id === result.personId)
      if (!person) return []
      return [
        {
          person,
          verdict: result.result.verdict,
          hits: result.result.hits,
        },
      ]
    })
    .filter((row) => !hideCompatibleRows.value || row.verdict !== 'COMPATIBLE')
})

type TableRowData = {
  person: PersonWithRestrictions
  verdict: Verdict
  hits: CompatibilityHit[]
}

type TableRow = {
  data: TableRowData
}

function getFoodItem(foodItemId: number) {
  return allFoodItems.value.find((item) => item.id === foodItemId)
}

function getRestriction(restrictionId: number) {
  return allRestrictions.value.find((r) => r.id === restrictionId)
}
</script>

<template>
  <h2>
    Vilka kan inte äta {{ selectedFoodItems.map((item) => getFoodItem(item)?.svName).join(', ') }}?
  </h2>
  <MultiSelect
    v-model="selectedFoodItems"
    :options="dishes"
    option-label="svName"
    option-value="id"
    placeholder="Välj maträtter"
  />
  <div style="display: flex; align-items: center; margin: 1em 0px">
    <Checkbox input-id="hide-compat" v-model="hideCompatibleRows" binary />
    <label for="hide-compat">Dölj kompatibla rader</label>
  </div>
  <DataTable :value="tableRows" :loading="loading" responsiveLayout="scroll">
    <Column header="Person">
      <template #body="{ data }: TableRow">
        <div style="display: flex; flex-direction: column">
          <span>
            {{ data.person.name }}
          </span>
          <span style="font-size: 14px; color: #777">
            <template v-for="(restriction, index) in data.person.restrictions">
              {{ restriction.restriction.svName
              }}<template v-if="index < data.person.restrictions.length - 1">, </template>
            </template>
          </span>
        </div>
      </template>
    </Column>
    <Column>
      <template #body="{ data }: TableRow">
        <span v-if="data.verdict === 'COMPATIBLE'">✅</span>
        <span v-else-if="data.verdict === 'INCOMPATIBLE'">❌</span>
        <span v-else-if="data.verdict === 'OPTIONAL_COMPATIBLE'">⚠️</span>
      </template>
    </Column>
    <Column field="hits" header="Träffar">
      <template #body="{ data }: TableRow">
        <ul>
          <li v-for="(hit, index) in data.hits" :key="index">
            <Tag v-if="hit.optional" severity="warning" label="Valfri" />
            <span>{{ getRestriction(hit.restrictionId)?.svName }}: </span>
            <template v-for="(foodItem, index) in hit.path" :key="index">
              {{ getFoodItem(foodItem)?.svName }}
              <span v-if="index < hit.path.length - 1"> → </span>
            </template>
          </li>
        </ul>
      </template>
    </Column>
  </DataTable>
</template>
