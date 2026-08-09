<script setup lang="ts">
import { peopleApi } from '@/api/client'
import type { Person } from '@/api/types'
import { useAppToast } from '@/composables/useAppToast'
import { Button, Column, DataTable, InputGroup, InputText } from 'primevue'
import { onMounted, ref } from 'vue'

const toast = useAppToast()

const loading = ref(true)
const people = ref<Person[]>([])
const newName = ref('')
const creating = ref(false)

onMounted(async () => {
  try {
    people.value = await peopleApi.all()
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta personerna.')
  } finally {
    loading.value = false
  }
})

async function createPerson() {
  if (!newName.value) {
    toast.warn('Skriv ett namn.')
    return
  }
  creating.value = true
  try {
    people.value.push(await peopleApi.create(newName.value))
    newName.value = ''
  } catch (error) {
    toast.fromError(error, 'Kunde inte skapa personen.')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Personer</h2>
  <DataTable :value="people" :loading="loading">
    <template #empty>Det finns inga personer ännu.</template>
    <Column field="name" header="Namn">
      <template #body="{ data }: { data: Person }">
        <RouterLink :to="`/people/${data.id}`">{{ data.name }}</RouterLink>
      </template>
    </Column>
  </DataTable>
  <InputGroup>
    <InputText v-model="newName" placeholder="Namn på ny person" @keyup.enter="createPerson" />
    <Button icon="pi pi-plus" :loading="creating" @click="createPerson" label="Skapa ny person" />
  </InputGroup>
</template>
