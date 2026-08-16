<script setup lang="ts">
import { personGroupsApi } from '@/api/client'
import type { PersonGroup } from '@/api/types'
import { Button, DataTable, Column, InputText, Tag, useToast } from 'primevue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const toast = useToast()

const loading = ref(true)
const groups = ref<PersonGroup[]>([])

onMounted(async () => {
  try {
    groups.value = await personGroupsApi.list()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch groups' })
    console.error('Error fetching groups:', error)
  } finally {
    loading.value = false
  }
})

const newGroupName = ref('')
const creating = ref(false)

async function createNew() {
  creating.value = true
  const name = newGroupName.value
  try {
    const newItem = await personGroupsApi.create(name)
    groups.value.push(newItem)
    newGroupName.value = ''
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create new item' })
    console.error('Error creating new item:', error)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Grupper</h2>
  <InputText v-model="newGroupName" placeholder="Namn på ny grupp" @keyup.enter="createNew()" />
  <Button :loading="creating" @click="createNew()" label="Skapa ny grupp" />
  <DataTable :value="groups" :loading="loading">
    <Column header="Namn">
      <template #body="{ data }: { data: PersonGroup }">
        <RouterLink :to="`/groups/${data.id}`">
          {{ data.svName }}
        </RouterLink>
      </template>
    </Column>
  </DataTable>
</template>
