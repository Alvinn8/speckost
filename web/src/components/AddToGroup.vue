<script setup lang="ts">
import { personGroupsApi } from '@/api/client'
import type { PersonGroup } from '@/api/types'
import { Select, Button } from 'primevue'
import { onMounted, ref } from 'vue'

const props = defineProps<{
  personIds: number[]
}>()

const groups = ref<PersonGroup[]>([])
const selectedGroupId = ref<number | null>(null)

onMounted(async () => {
  try {
    groups.value = await personGroupsApi.list()
  } catch (error) {
    console.error('Error fetching groups:', error)
  }
})

async function addToGroup() {
  if (selectedGroupId.value === null) return
  try {
    await personGroupsApi.addPersonBulk(selectedGroupId.value, props.personIds)
  } catch (error) {
    console.error('Error adding to group:', error)
  }
}
</script>

<template>
  <p>Välj grupp att lägga till i:</p>
  <Select
    v-model="selectedGroupId"
    :options="groups"
    option-label="svName"
    option-value="id"
    placeholder="Välj grupp"
    filter
    autoFilterFocus
    show-clear
  />
  <Button
    label="Lägg till"
    icon="pi pi-check"
    :disabled="selectedGroupId === null"
    @click="addToGroup()"
  />
</template>
