import { ref, onMounted } from 'vue'
import { defineStore } from 'pinia'
import type { Restriction } from '@/api/types'
import { restrictionsApi } from '@/api/client'
import { useToast } from 'primevue'

export const useAllRestrictions = defineStore('all_restrictions', () => {
  const hasFetched = ref(false)
  const allRestrictions = ref<Restriction[]>([])

  const toast = useToast()

  onMounted(async () => {
    if (hasFetched.value) return
    hasFetched.value = true
    try {
      const items = await restrictionsApi.list()
      allRestrictions.value = items
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch all restrictions' })
      console.error('Failed to fetch all restrictions:', error)
    }
  })

  function addRestriction(item: Restriction) {
    allRestrictions.value.push(item)
  }

  return { value: allRestrictions, addRestriction }
})
