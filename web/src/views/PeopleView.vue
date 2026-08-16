<script lang="ts" setup>
import { peopleApi } from '@/api/client'
import type { PersonWithData } from '@/api/types'
import AddToGroup from '@/components/AddToGroup.vue'
import PersonRestrictions from '@/components/PersonRestrictions.vue'
import { parsePastedTable } from '@/util/importStudents'
import { Button, Column, DataTable, Dialog, InputText, SplitButton, useToast } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { onMounted, ref } from 'vue'

const toast = useToast()

const loading = ref(false)
const people = ref<PersonWithData[]>([])

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

const selectedPeople = ref<PersonWithData[]>([])
const showAddToGroupDialog = ref(false)

const menuItems: MenuItem[] = [
  {
    label: 'Lägg till i grupp',
    icon: 'pi pi-users',
    command: async () => {
      showAddToGroupDialog.value = true
    },
  },
  {
    label: 'Ta bort valda',
    icon: 'pi pi-trash',
    command: async () => {
      if (selectedPeople.value.length === 0) return
      const idsToDelete = selectedPeople.value.map((p) => p.id)
      try {
        await peopleApi.bulkDelete(idsToDelete)
        people.value = people.value.filter((p) => !idsToDelete.includes(p.id))
        selectedPeople.value = []
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `${idsToDelete.length} personer har tagits bort`,
        })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: (error as Error).message })
      }
    },
  },
]

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
    v-model:visible="showAddToGroupDialog"
    header="Lägg till i grupp"
    :modal="true"
    :dismissableMask="true"
  >
    <AddToGroup :personIds="selectedPeople.map((p) => p.id)" />
  </Dialog>
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
  <div style="margin: 1em 0">
    <SplitButton
      v-if="selectedPeople.length > 0"
      :model="menuItems"
      :label="`Åtgärder för ${selectedPeople.length} valda:`"
    />
  </div>
  <DataTable
    :value="people"
    :loading="loading"
    selectionMode="multiple"
    v-model:selection="selectedPeople"
  >
    <Column selectionMode="multiple" />
    <Column field="name" header="Namn" />
    <Column header="Grupper">
      <template #body="{ data }: { data: PersonWithData }">
        <ul>
          <li v-for="group in data.groups" :key="group.id">
            {{ group.svName }}
          </li>
        </ul>
      </template>
    </Column>
    <Column field="restrictions" header="Matpreferenser / Allergier">
      <template #body="{ data }: { data: PersonWithData }">
        <PersonRestrictions
          :person="data"
          @update:restrictions="(res) => (data.restrictions = res)"
        />
      </template>
    </Column>
  </DataTable>
</template>
