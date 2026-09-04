<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DataTable, Column, InputText, Button, useToast, Tag } from 'primevue'
import { restrictionsApi } from '@/api/client'
import type { Restriction } from '@/api/types'
import { RouterLink } from 'vue-router'
import { useAllRestrictions } from '@/stores/allRestrictions'

const toast = useToast()
const allRestrictions = useAllRestrictions()

const loading = ref(false)
const restrictions = ref<Restriction[]>([])

onMounted(async () => {
  loading.value = true
  try {
    restrictions.value = await restrictionsApi.list()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch restrictions' })
    console.error('Error fetching restrictions:', error)
  } finally {
    loading.value = false
  }
})

const newDishName = ref('')
const creating = ref(false)

async function createNew() {
  creating.value = true
  const name = newDishName.value
  try {
    const newItem = await restrictionsApi.create(name)
    restrictions.value.push(newItem)
    allRestrictions.addRestriction(newItem)
    newDishName.value = ''
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create new restriction' })
    console.error('Error creating new restriction:', error)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <h2>Matpreferenser / Allergier</h2>
  <InputText v-model="newDishName" placeholder="Namn på ny" @keyup.enter="createNew()" />
  <Button :loading="creating" @click="createNew()" label="Skapa ny matpreferens / allergi" />
  <br /><br />
  <DataTable :value="restrictions" :loading="loading" responsiveLayout="scroll">
    <Column field="svName" header="Namn">
      <template #body="slotProps">
        <RouterLink :to="`/restrictions/${slotProps.data.id}`">
          {{ slotProps.data.svName }}
        </RouterLink>
        {{ ' ' }}
        <Tag
          v-if="slotProps.data.foodItems.length === 0"
          icon="pi pi-exclamation-triangle"
          severity="warn"
          value="Ej konfigurerad"
        />
      </template>
    </Column>
  </DataTable>
</template>
