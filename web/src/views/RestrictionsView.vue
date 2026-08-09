<script setup lang="ts">
import { restrictionsApi } from '@/api/client'
import type { Restriction } from '@/api/types'
import { useAppToast } from '@/composables/useAppToast'
import { Button, Column, DataTable, InputGroup, InputText } from 'primevue'
import { onMounted, ref } from 'vue'

const toast = useAppToast()

const loading = ref(true)
const restrictions = ref<Restriction[]>([])
const newName = ref('')
const creating = ref(false)

onMounted(async () => {
  try {
    restrictions.value = await restrictionsApi.all()
  } catch (error) {
    toast.fromError(error, 'Kunde inte hämta restriktionerna.')
  } finally {
    loading.value = false
  }
})

async function createRestriction() {
  if (!newName.value) {
    toast.warn('Skriv ett namn.')
    return
  }
  creating.value = true
  try {
    restrictions.value.push(await restrictionsApi.create(newName.value))
    newName.value = ''
  } catch (error) {
    toast.fromError(error, 'Kunde inte skapa restriktionen.')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Restriktioner</h2>
  <p>
    En restriktion är till exempel en allergi eller en matpreferens. Den pekar ut de livsmedel som
    inte får ätas.
  </p>
  <DataTable :value="restrictions" :loading="loading">
    <template #empty>Det finns inga restriktioner ännu.</template>
    <Column field="svName" header="Namn">
      <template #body="{ data }: { data: Restriction }">
        <RouterLink :to="`/restrictions/${data.id}`">{{ data.svName }}</RouterLink>
      </template>
    </Column>
  </DataTable>
  <InputGroup>
    <InputText
      v-model="newName"
      placeholder="Namn på ny restriktion"
      @keyup.enter="createRestriction"
    />
    <Button
      icon="pi pi-plus"
      :loading="creating"
      @click="createRestriction"
      label="Skapa ny restriktion"
    />
  </InputGroup>
</template>
