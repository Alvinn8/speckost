<script setup lang="ts">
import { personGroupsApi } from '@/api/client'
import type { PersonGroup, PersonWithData } from '@/api/types'
import { Select, Button, useToast } from 'primevue'
import { onMounted, ref } from 'vue'

const props = defineProps<{
  people: PersonWithData[]
}>()

const emit = defineEmits<{
  (e: 'added'): void
}>()

const toast = useToast()

const groups = ref<PersonGroup[]>([])
const selectedGroupId = ref<number | null>(null)

onMounted(async () => {
  try {
    groups.value = await personGroupsApi.list()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  }
})

async function addToGroup() {
  if (selectedGroupId.value === null) return
  try {
    await personGroupsApi.addPersonBulk(
      selectedGroupId.value,
      props.people.map((p) => p.id),
    )
    const group = groups.value.find((g) => g.id === selectedGroupId.value)
    if (group) {
      props.people.forEach((p) => {
        p.groups.push(group)
      })
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${props.people.length} personer har lagts till i gruppen ${group?.svName}`,
    })
    emit('added')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
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
