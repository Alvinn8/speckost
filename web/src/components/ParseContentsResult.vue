<script setup lang="ts">
import { FoodItemType } from '@/api/types'
import { useAllFoodItems } from '@/stores/allFoodItems'
import type { ParseResult } from '@/util/parseContents'
import { Button, Column, DataTable, Select } from 'primevue'
import { computed, ref, watchEffect } from 'vue'

type Props = {
  parseResults: ParseResult
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'add', foodItemIds: number[]): void
}>()

const allFoodItems = useAllFoodItems()

const foodItemOptions = computed(() => {
  // Show normal food items first, then categories, then dishes
  const typeOrder = [FoodItemType.NORMAL, FoodItemType.CATEGORY, FoodItemType.DISH]
  return [...allFoodItems.value].sort((a, b) => {
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  })
})

type Row = {
  text: string
  untransformedText?: string
  foodItemId?: number
}
const rows = ref<Row[]>([])

watchEffect(() => {
  rows.value = props.parseResults.entries.map((entry) => ({
    text: entry.text,
    untransformedText: entry.untransformedText,
    foodItemId: entry.foodItem?.id,
  }))
})

const numberOfMatches = computed(() => rows.value.filter((row) => row.foodItemId).length)

function add() {
  const foodItemIds = rows.value.map((row) => row.foodItemId).filter((id) => id !== undefined)
  emit('add', foodItemIds)
}
</script>

<template>
  <div style="width: 500px">
    <p>
      Systemet har försökt matcha texten du klistrade in med livsmedel som finns i systemet. Om det
      står '-' välj gärna manuellt det livsmedel som passar.
    </p>
    <p>
      Om ett livsmedel saknas i systemet, avbryt och skapa livsmedlet i systemet via fliken
      "Livsmedel". Klistra sedan in innehållsförteckningen igen och välj det livsmedel som saknades.
    </p>
    <p>
      Det går också bra att lämna rader tomma ('-') för att skippa det livsmedlet, om det är
      oviktigt eller redan representerat.
    </p>
    <strong style="margin-bottom: 0">Texten du klistrade in:</strong>
    <pre style="white-space: pre-wrap; word-break: break-word; margin-top: 0">{{
      props.parseResults.originalText
    }}</pre>
  </div>
  <DataTable :value="rows" responsiveLayout="scroll">
    <Column header="Text">
      <template #body="{ data }: { data: Row }">
        <div style="display: flex; flex-direction: column">
          {{ data.text }}
          <small
            v-if="data.untransformedText && data.untransformedText !== data.text"
            style="color: #777"
          >
            Från: {{ data.untransformedText }}
          </small>
        </div>
      </template>
    </Column>
    <Column header="Matchat livsmedel">
      <template #body="{ data }: { data: Row }">
        <Select
          v-model="data.foodItemId"
          :options="foodItemOptions"
          option-label="svName"
          option-value="id"
          placeholder="-"
          filter
          autoFilterFocus
          showClear
        />
      </template>
    </Column>
  </DataTable>
  <div style="display: flex; justify-content: space-between; margin-top: 1rem">
    <Button label="Avbryt" severity="secondary" @click="$emit('cancel')" />
    <Button
      :label="`Lägg till ${numberOfMatches} livsmedel`"
      :disabled="numberOfMatches === 0"
      @click="add"
    />
  </div>
</template>
