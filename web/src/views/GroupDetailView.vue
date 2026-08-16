<script setup lang="ts">
import { peopleApi, personGroupsApi } from '@/api/client'
import { type PersonGroup, type PersonGroupWithMembers, type PersonWithData } from '@/api/types'
import PersonRestrictions from '@/components/PersonRestrictions.vue'
import {
  DataTable,
  Column,
  Button,
  Select,
  InputGroup,
  Panel,
  ProgressSpinner,
  useToast,
} from 'primevue'
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const toast = useToast()
const route = useRoute()
const id = computed(() => Number(route.params.id))

const allPeople = ref<PersonWithData[]>([])
const allGroups = ref<PersonGroup[]>([])

const loading = ref(false)
const group = ref<PersonGroupWithMembers | null>(null)

const personId = ref<number | null>(null)
const subGroupId = ref<number | null>(null)
const adding = ref(false)

const selectablePeople = computed(() => {
  if (!group.value) return []
  const groupPersonIds = new Set(group.value.people.map((p) => p.id))
  return allPeople.value.filter((p) => !groupPersonIds.has(p.id))
})

const selectableSubGroups = computed(() => {
  if (!group.value) return []
  const groupSubGroupIds = new Set(group.value.subGroups.map((g) => g.id))
  return allGroups.value.filter((g) => !groupSubGroupIds.has(g.id) && g.id !== id.value)
})

onMounted(async () => {
  loading.value = true
  try {
    group.value = await personGroupsApi.get(id.value)
    allPeople.value = await peopleApi.list()
    allGroups.value = await personGroupsApi.list()
  } catch (error) {
    console.error('Error fetching group:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch group' })
  } finally {
    loading.value = false
  }
})

async function addPerson() {
  if (personId.value === null) return
  adding.value = true
  try {
    await personGroupsApi.addPerson(id.value, personId.value)
    group.value = await personGroupsApi.get(id.value)
    personId.value = null
  } catch (error) {
    console.error('Error adding person to group:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add person' })
  } finally {
    adding.value = false
  }
}

async function removePerson(personIdToRemove: number) {
  try {
    await personGroupsApi.removePerson(id.value, personIdToRemove)
    group.value = await personGroupsApi.get(id.value)
  } catch (error) {
    console.error('Error removing person from group:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove person' })
  }
}

async function addSubGroup() {
  if (subGroupId.value === null) return
  adding.value = true
  try {
    await personGroupsApi.addSubGroup(id.value, subGroupId.value)
    group.value = await personGroupsApi.get(id.value)
    subGroupId.value = null
  } catch (error) {
    console.error('Error adding subgroup:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add subgroup' })
  } finally {
    adding.value = false
  }
}

async function removeSubGroup(subGroupIdToRemove: number) {
  try {
    await personGroupsApi.removeSubGroup(id.value, subGroupIdToRemove)
    group.value = await personGroupsApi.get(id.value)
  } catch (error) {
    console.error('Error removing subgroup:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove subgroup' })
  }
}
</script>

<template>
  <h2>{{ group?.svName }}</h2>
  <ProgressSpinner v-if="loading" />
  <Panel header="Undergrupper">
    <DataTable :value="group?.subGroups">
      <Column header="Namn">
        <template #body="{ data }: { data: PersonGroup }">
          <RouterLink :to="`/groups/${data.id}`">
            {{ data.svName }}
          </RouterLink>
        </template>
      </Column>
      <Column>
        <template #body="{ data }: { data: PersonGroup }">
          <Button
            icon="pi pi-user-minus"
            severity="danger"
            text
            aria-label="Ta bort"
            @click="removeSubGroup(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <InputGroup>
        <Select
          v-model="subGroupId"
          :options="selectableSubGroups"
          option-label="svName"
          option-value="id"
          placeholder="Välj undergrupp"
          filter
          autoFilterFocus
          show-clear
        />
        <Button
          icon="pi pi-plus"
          label="Lägg till"
          :loading="adding"
          :disabled="subGroupId === null"
          @click="addSubGroup"
        />
      </InputGroup>
    </template>
  </Panel>
  <Panel header="Direkta medlemmar" style="margin-top: 1em">
    <DataTable :value="group?.people">
      <Column field="name" header="Namn" />
      <Column field="restrictions" header="Matpreferenser / Allergier">
        <template #body="{ data }: { data: PersonWithData }">
          <PersonRestrictions
            :person="data"
            @update:restrictions="(res) => (data.restrictions = res)"
          />
        </template>
      </Column>
      <Column>
        <template #body="{ data }: { data: PersonWithData }">
          <Button
            icon="pi pi-user-minus"
            severity="danger"
            text
            aria-label="Ta bort"
            @click="removePerson(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <InputGroup>
        <Select
          v-model="personId"
          :options="selectablePeople"
          option-label="name"
          option-value="id"
          placeholder="Välj person"
          filter
          autoFilterFocus
          show-clear
        />
        <Button
          icon="pi pi-plus"
          label="Lägg till"
          :loading="adding"
          :disabled="personId === null"
          @click="addPerson"
        />
      </InputGroup>
    </template>
  </Panel>
</template>
