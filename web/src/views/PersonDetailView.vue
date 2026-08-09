<script setup lang="ts">
import { peopleApi, restrictionsApi } from '@/api/client'
import {
  Verdict,
  type FoodItemVerdict,
  type PersonWithRestrictions,
  type Restriction,
  type RestrictionReason,
} from '@/api/types'
import LinkedItemsPanel from '@/components/LinkedItemsPanel.vue'
import { useAppToast } from '@/composables/useAppToast'
import { Column, DataTable, Panel, ProgressSpinner, Tag } from 'primevue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const toast = useAppToast()
const route = useRoute()

const id = Number(route.params.id)

const person = ref<PersonWithRestrictions | null>(null)
const allRestrictions = ref<Restriction[]>([])
const verdicts = ref<FoodItemVerdict[]>([])
const loadingVerdicts = ref(true)
const saving = ref(false)

const verdictLabels: Record<Verdict, string> = {
  [Verdict.SAFE]: 'Kan ätas',
  [Verdict.UNSAFE]: 'Kan inte ätas',
  [Verdict.MAYBE]: 'Beror på',
}

const verdictSeverities: Record<Verdict, string> = {
  [Verdict.SAFE]: 'success',
  [Verdict.UNSAFE]: 'danger',
  [Verdict.MAYBE]: 'warn',
}

/** "Falafelrulle → Falafel → Kikärtor → Baljväxter". */
function chain(reason: RestrictionReason) {
  return reason.path.map((foodItem) => foodItem.svName).join(' → ')
}

onMounted(async () => {
  try {
    ;[person.value, allRestrictions.value] = await Promise.all([
      peopleApi.get(id),
      restrictionsApi.all(),
    ])
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta personen.')
    return
  }
  await loadVerdicts()
})

async function loadVerdicts() {
  loadingVerdicts.value = true
  try {
    verdicts.value = await peopleApi.foodItems(id)
  } catch (error) {
    toast.fromError(error, 'Kunde inte räkna ut vad personen kan äta.')
  } finally {
    loadingVerdicts.value = false
  }
}

async function addRestriction(restrictionId: number) {
  saving.value = true
  try {
    const restriction = await peopleApi.addRestriction(id, restrictionId)
    person.value?.restrictions.push(restriction)
    toast.success(`${restriction.svName} lades till.`)
    await loadVerdicts()
  } catch (error) {
    toast.fromError(error, 'Kunde inte lägga till restriktionen.')
  } finally {
    saving.value = false
  }
}

async function removeRestriction(restriction: Restriction) {
  try {
    await peopleApi.removeRestriction(id, restriction.id)
    if (person.value) {
      person.value.restrictions = person.value.restrictions.filter(
        (item) => item.id !== restriction.id,
      )
    }
    toast.success(`${restriction.svName} togs bort.`)
    await loadVerdicts()
  } catch (error) {
    toast.fromError(error, 'Kunde inte ta bort restriktionen.')
  }
}
</script>

<template>
  <ProgressSpinner v-if="!person" />
  <div v-else>
    <h2>{{ person.name }}</h2>

    <LinkedItemsPanel
      header="Restriktioner"
      column-header="Restriktion"
      :items="person.restrictions"
      :options="allRestrictions"
      :label="(restriction) => restriction.svName"
      :route="(restriction) => `/restrictions/${restriction.id}`"
      placeholder="Välj restriktion"
      add-label="Lägg till"
      empty-message="Personen har inga restriktioner ännu."
      :busy="saving"
      @add="addRestriction"
      @remove="removeRestriction"
    />

    <Panel header="Livsmedel">
      <DataTable :value="verdicts" :loading="loadingVerdicts">
        <template #empty>Det finns inga livsmedel ännu.</template>
        <Column header="Livsmedel">
          <template #body="{ data }: { data: FoodItemVerdict }">
            <RouterLink :to="`/food-items/${data.foodItem.id}`">
              {{ data.foodItem.svName }}
            </RouterLink>
          </template>
        </Column>
        <Column header="Kan ätas?">
          <template #body="{ data }: { data: FoodItemVerdict }">
            <Tag :value="verdictLabels[data.verdict]" :severity="verdictSeverities[data.verdict]" />
          </template>
        </Column>
        <Column header="Varför inte?">
          <template #body="{ data }: { data: FoodItemVerdict }">
            <div v-for="reason in data.reasons" :key="reason.foodItem.id">
              {{ reason.restrictions.map((restriction) => restriction.svName).join(', ') }}:
              {{ chain(reason) }}
              <template v-if="reason.optional">(valfri ingrediens)</template>
            </div>
          </template>
        </Column>
      </DataTable>
    </Panel>
  </div>
</template>
