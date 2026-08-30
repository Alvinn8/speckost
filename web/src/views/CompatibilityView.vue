<script setup lang="ts">
import { compatibilityApi, peopleApi, personGroupsApi } from '@/api/client'
import type {
  GroupCompatibilityResult,
  PersonWithData,
  Verdict,
  CompatibilityHit,
  PersonGroup,
} from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { useAllRestrictions } from '@/stores/allRestrictions'
import { DataTable, Column, useToast, MultiSelect, Tag, Checkbox } from 'primevue'
import { computed, onMounted, ref, watchEffect } from 'vue'

const toast = useToast()
const allFoodItems = useAllFoodItems()
const allRestrictions = useAllRestrictions()
const allPeople = ref<PersonWithData[]>([])
const allGroups = ref<PersonGroup[]>([])

const selectedFoodItems = ref<number[]>([])
const selectedGroups = ref<number[]>([])
const people = ref<number[]>([])

const dishes = computed(() => allFoodItems.value.filter((item) => item.type === 'DISH'))

const compatibilityResult = ref<GroupCompatibilityResult | null>(null)
const loading = ref(false)

onMounted(async () => {
  try {
    allPeople.value = await peopleApi.list()
    allGroups.value = await personGroupsApi.list()
    people.value = allPeople.value.map((p) => p.id)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  }
  const url = new URL(window.location.href)
  const foodItemsParam = url.searchParams.get('foodItems')
  const groupsParam = url.searchParams.get('groups')
  if (foodItemsParam) {
    selectedFoodItems.value = foodItemsParam.split(',').map((id) => Number(id))
  }
  if (groupsParam) {
    selectedGroups.value = groupsParam.split(',').map((id) => Number(id))
  }
})

watchEffect(async () => {
  if (selectedGroups.value.length === 0) {
    people.value = allPeople.value.map((p) => p.id)
  } else {
    const selectedGroupIds = new Set(selectedGroups.value)
    const peopleSet = new Set<number>()
    for (const groupId of selectedGroupIds) {
      const allPeople = await personGroupsApi.allPeople(groupId)
      allPeople.forEach((p) => peopleSet.add(p.id))
    }
    people.value = Array.from(peopleSet)
  }
})

watchEffect(async () => {
  if (selectedFoodItems.value.length === 0 || people.value.length === 0) {
    compatibilityResult.value = null
    return
  }

  loading.value = true
  try {
    compatibilityResult.value = await compatibilityApi.check(people.value, selectedFoodItems.value)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  } finally {
    loading.value = false
  }

  const url = new URL(window.location.href)
  url.searchParams.set('foodItems', selectedFoodItems.value.join(','))
  url.searchParams.set('groups', selectedGroups.value.join(','))
  window.history.replaceState({}, '', url.toString())
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

const restrictionMatchesSummary = computed(() => {
  const restrictionMatchCounts = new Map<string, number>() // key is CSV of distinct restriction IDs, sorted for uniqueness
  for (const row of tableRows.value) {
    if (row.verdict === 'COMPATIBLE') continue
    const restrictionIds = row.hits
      .map((hit) => hit.restrictionId)
      .filter((id, index, array) => array.indexOf(id) === index) // https://stackoverflow.com/a/14438954
      .sort((a, b) => a - b)
    const key = restrictionIds.join(',')
    restrictionMatchCounts.set(key, (restrictionMatchCounts.get(key) ?? 0) + 1)
  }
  return Array.from(restrictionMatchCounts.entries()).map(([key, count]) => {
    const restrictionIds = key.split(',').map((id) => Number(id))
    const restrictionNames = restrictionIds
      .map((id) => getRestriction(id)?.svName)
      .filter((name): name is string => name !== undefined)
      .join(', ')
    return {
      restrictions: restrictionNames,
      count,
    }
  })
})

type TableRowData = {
  person: PersonWithData
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
    v-model="selectedGroups"
    :options="allGroups"
    option-label="svName"
    option-value="id"
    placeholder="Välj grupper"
  />
  <MultiSelect
    v-model="selectedFoodItems"
    :options="dishes"
    option-label="svName"
    option-value="id"
    placeholder="Välj maträtter"
  />
  <h3>Sammanfattning</h3>
  <ul>
    <li v-for="(summary, index) in restrictionMatchesSummary" :key="index">
      {{ summary.count }} {{ summary.restrictions }}
    </li>
  </ul>
  <h3>Alla träffar</h3>
  <div style="display: flex; align-items: center; margin: 1em 0px; gap: 4px">
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
