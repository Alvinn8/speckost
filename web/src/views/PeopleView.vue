<script lang="ts" setup>
import { peopleApi } from '@/api/client'
import type { PersonWithRestrictions } from '@/api/types'
import PersonRestrictions from '@/components/PersonRestrictions.vue'
import { parsePastedTable } from '@/util/importStudents'
import { Button, Column, DataTable, Dialog, InputText, useToast } from 'primevue'
import { onMounted, ref } from 'vue'

const toast = useToast()

const loading = ref(false)
const people = ref<PersonWithRestrictions[]>([])

onMounted(async () => {
  loading.value = true
  try {
    people.value = await peopleApi.list()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  } finally {
    loading.value = false
  }
})

const newName = ref('')
const adding = ref(false)

async function addPerson() {
  if (!newName.value.trim()) return

  adding.value = true
  try {
    const person = await peopleApi.create(newName.value)
    people.value.push(person)
    newName.value = ''
    toast.add({ severity: 'success', summary: 'Success', detail: 'Personen har lagts till' })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  } finally {
    adding.value = false
  }
}

const showImportFromTableDialog = ref(false)

async function importFromCopiedTable(e: ClipboardEvent) {
  e.preventDefault()
  const importedPeople = await parsePastedTable(e, toast)
  if (!importedPeople || importedPeople.length === 0) {
    return
  }
  try {
    const createdPeople = await peopleApi.bulkCreate(importedPeople)
    people.value.push(...createdPeople)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${importedPeople.length} personer har importerats`,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
  }
}
</script>

<template>
  <h2>Personer</h2>
  <Button label="Importera från kopierad tabell" @click="showImportFromTableDialog = true" />
  <br />
  <Dialog
    header="Importera personer"
    v-model:visible="showImportFromTableDialog"
    :modal="true"
    :closable="true"
  >
    <p>Klistra in en tabell med namn och matpreferenser/allergier här:</p>
    <textarea @paste="importFromCopiedTable"></textarea>
  </Dialog>
  <InputText v-model="newName" placeholder="Namn på ny person" @keyup.enter="addPerson" />
  <Button label="Lägg till" icon="pi pi-plus" @click="addPerson" :loading="adding" />
  <DataTable :value="people" :loading="loading">
    <Column field="name" header="Namn" />
    <Column field="restrictions" header="Matpreferenser / Allergier">
      <template #body="{ data }: { data: PersonWithRestrictions }">
        <PersonRestrictions
          :person="data"
          @update:restrictions="(res) => (data.restrictions = res)"
        />
      </template>
    </Column>
  </DataTable>
</template>
