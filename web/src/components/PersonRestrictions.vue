<script setup lang="ts">
import { peopleApi } from '@/api/client'
import type { PersonRestrictionWithRestriction, PersonWithData } from '@/api/types'
import { useAllRestrictions } from '@/stores/allRestrictions'
import { MultiSelect } from 'primevue'
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  person: PersonWithData
}>()

const emit = defineEmits<{
  (e: 'update:restrictions', restrictions: PersonRestrictionWithRestriction[]): void
}>()

const allRestrictions = useAllRestrictions()

const restrictionIds = ref<number[]>(props.person.restrictions.map((r) => r.restrictionId))

watchEffect(() => {
  restrictionIds.value = props.person.restrictions.map((r) => r.restrictionId)
})

async function updatePersonRestrictions() {
  const newRestrictionIds = restrictionIds.value
  const oldRestrictionIds = props.person.restrictions.map((r) => r.restrictionId)
  const addedIds = newRestrictionIds.filter((id) => !oldRestrictionIds.includes(id))
  const removedIds = oldRestrictionIds.filter((id) => !newRestrictionIds.includes(id))

  // TODO maybe better backend API that can do this in one request?
  // Update the person's restrictions in the backend
  try {
    await Promise.all(removedIds.map((id) => peopleApi.removeRestriction(props.person.id, id)))
    const addedRestrictions = await Promise.all(
      addedIds.map((id) => peopleApi.addRestriction(props.person.id, id)).flatMap((res) => res),
    ) // Flatten the array of arrays
    // Update the local state
    const newRestrictions = props.person.restrictions.filter(
      (r) => !removedIds.includes(r.restrictionId),
    )
    newRestrictions.push(...addedRestrictions)
    emit('update:restrictions', newRestrictions)
  } catch (error) {
    console.error('Failed to update restrictions:', error)
  }
}
</script>

<template>
  <MultiSelect
    v-model="restrictionIds"
    :options="allRestrictions.value"
    option-label="svName"
    option-value="id"
    :display="'chip'"
    filter
    autoFilterFocus
    @change="updatePersonRestrictions()"
  />
</template>
