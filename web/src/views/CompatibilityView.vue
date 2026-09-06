<script setup lang="ts">
import { compatibilityApi, peopleApi, personGroupsApi } from '@/api/client'
import type {
  AlternativeResolution,
  GroupCompatibilityResult,
  PersonWithData,
  Verdict,
  CompatibilityHit,
  PersonGroup,
} from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import { useAllRestrictions } from '@/stores/allRestrictions'
import { DataTable, Column, useToast, MultiSelect, Tag } from 'primevue'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'

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
})

watch([selectedFoodItems, selectedGroups], ([foodItems, groups]) => {
  const url = new URL(window.location.href)
  url.searchParams.set('foodItems', foodItems.join(','))
  url.searchParams.set('groups', groups.join(','))
  if (location.href !== url.toString()) {
    window.history.pushState({}, '', url.toString())
  }
})

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
          alternativeResolutions: result.result.alternativeResolutions,
        },
      ]
    })
    .filter((row) => row.verdict !== 'COMPATIBLE')
})

const restrictionMatchesSummary = computed(() => {
  const restrictionMatchCounts = new Map<string, number>()
  for (const row of tableRows.value) {
    if (row.hits.length === 0 && row.alternativeResolutions.length === 0) continue
    const restrictionIds = [
      ...row.hits.map((hit) => hit.restrictionId),
      ...row.alternativeResolutions.flatMap((resolution) =>
        resolution.originalHits.map((hit) => hit.restrictionId),
      ),
    ]
    const restrictionNames = restrictionIds
      .filter((id, index, array) => array.indexOf(id) === index) // https://stackoverflow.com/a/14438954
      .sort((a, b) => a - b)
      .map((id) => getRestriction(id)?.svName)
      .filter((name): name is string => name !== undefined)
      .join(', ')
    const replacementText = row.alternativeResolutions
      .map((resolution) => {
        const originalFoodItem = getFoodItem(resolution.originalFoodItemId)
        const alternativeFoodItem = getFoodItem(resolution.alternativeFoodItemId)
        return `Ersätt ${originalFoodItem?.svName} med ${alternativeFoodItem?.svName}`
      })
      .sort()
      .join('Y_SEPARATOR_Y') // TODO so hacky D;
    const text = [restrictionNames, replacementText]
      .filter((s) => s.length > 0)
      .join('X_SEPARATOR_X') // TODO hacky
    restrictionMatchCounts.set(text, (restrictionMatchCounts.get(text) ?? 0) + 1)
  }
  return Array.from(restrictionMatchCounts.entries()).map(([restrictions, count]) => {
    const parts = restrictions.split('X_SEPARATOR_X')
    const restrictionNames = parts[0]
    const replacementTexts = (parts[1] || '').split('Y_SEPARATOR_Y').filter((s) => s.length > 0)
    return { restrictions: restrictionNames, replacementTexts, count }
  })
})

type TableRowData = {
  person: PersonWithData
  verdict: Verdict
  hits: CompatibilityHit[]
  alternativeResolutions: AlternativeResolution[]
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

/** Distinct restriction names behind a set of hits, e.g. "Laktosintolerant, Baljväxter". */
function restrictionNamesOf(hits: CompatibilityHit[]) {
  return Array.from(new Set(hits.map((hit) => hit.restrictionId)))
    .map((id) => getRestriction(id)?.svName)
    .filter((name): name is string => name !== undefined)
    .join(', ')
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
    filter
    autoFilterFocus
    :maxSelectedLabels="2"
  />
  <MultiSelect
    v-model="selectedFoodItems"
    :options="dishes"
    option-label="svName"
    option-value="id"
    placeholder="Välj maträtter"
    filter
    autoFilterFocus
    :maxSelectedLabels="1"
  />
  <h3>Sammanfattning</h3>
  <ul>
    <li v-for="(summary, index) in restrictionMatchesSummary" :key="index">
      {{ summary.count }} {{ summary.restrictions }}
      <ul v-if="summary.replacementTexts.length > 0">
        <li v-for="(text, i) in summary.replacementTexts" :key="i">
          {{ text }}
        </li>
      </ul>
    </li>
  </ul>
  <h3>Alla träffar</h3>
  <DataTable
    v-if="selectedFoodItems.length > 0"
    :value="tableRows"
    :loading="loading"
    responsiveLayout="scroll"
  >
    <template #empty>
      <div>✅ Alla kan äta</div>
    </template>
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
    <Column :headerStyle="{ width: '40px' }">
      <template #body="{ data }: TableRow">
        <span v-if="data.verdict === 'COMPATIBLE'" title="Kan äta">✅</span>
        <span v-else-if="data.verdict === 'INCOMPATIBLE'" title="Kan inte äta">❌</span>
        <span
          v-else-if="data.verdict === 'OPTIONAL_COMPATIBLE'"
          title="Kan äta om valfria delar skippas"
          >⚠️</span
        >
        <span
          v-else-if="data.verdict === 'ALTERNATIVE_COMPATIBLE'"
          title="Kan äta om ett alternativ används"
          >🔄</span
        >
      </template>
    </Column>
    <Column field="hits" header="Träffar">
      <template #body="{ data }: TableRow">
        <ul v-if="data.alternativeResolutions.length > 0" style="margin: 0; padding-left: 1.2em">
          <li v-for="(resolution, index) in data.alternativeResolutions" :key="`res-${index}`">
            <strong>{{ restrictionNamesOf(resolution.originalHits) }}: </strong>
            <span>
              <template v-for="(foodItem, i) in resolution.path" :key="i">
                <span
                  :style="
                    i === resolution.path.length - 1
                      ? { textDecoration: 'line-through', color: '#b3261e' }
                      : {}
                  "
                >
                  {{ getFoodItem(foodItem)?.svName }}
                </span>
                <span v-if="i < resolution.path.length - 1"> → </span>
              </template>
              <span> → </span>
              <span style="color: #1a7f37">
                {{ getFoodItem(resolution.alternativeFoodItemId)?.svName }} ✅
              </span>
            </span>
          </li>
        </ul>

        <ul v-if="data.hits.length > 0" style="margin: 0; padding-left: 1.2em">
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
