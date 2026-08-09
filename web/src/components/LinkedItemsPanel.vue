<script setup lang="ts" generic="T extends { id: number }">
import { Button, Column, DataTable, InputGroup, Panel, Select, useConfirm } from 'primevue'
import { computed, ref } from 'vue'

const props = defineProps<{
  header: string
  columnHeader: string
  /** The items that are linked right now. */
  items: T[]
  /** Everything that can be linked; the ones already linked are filtered out. */
  options: T[]
  /** Reads the name to show from an item. */
  label: (item: T) => string
  /** Where the name should link to, when the item has a page of its own. */
  route?: (item: T) => string
  placeholder: string
  addLabel: string
  emptyMessage: string
  /** Set while the parent is saving, so the add button can show it. */
  busy?: boolean
}>()

const emit = defineEmits<{
  add: [id: number]
  remove: [item: T]
}>()

const selectedId = ref<number | null>(null)
const confirm = useConfirm()

const selectable = computed(() =>
  props.options
    .filter((option) => !props.items.some((item) => item.id === option.id))
    .map((option) => ({ id: option.id, label: props.label(option) })),
)

function add() {
  if (selectedId.value === null) return
  emit('add', selectedId.value)
  selectedId.value = null
}

function confirmRemove(item: T) {
  confirm.require({
    header: props.header,
    message: `Vill du ta bort ${props.label(item)}?`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Avbryt', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Ta bort', severity: 'danger' },
    accept: () => emit('remove', item),
  })
}
</script>

<template>
  <Panel :header="header">
    <DataTable :value="items">
      <template #empty>{{ emptyMessage }}</template>
      <Column :header="columnHeader">
        <template #body="{ data }: { data: T }">
          <RouterLink v-if="route" :to="route(data)">{{ label(data) }}</RouterLink>
          <span v-else>{{ label(data) }}</span>
        </template>
      </Column>
      <Column>
        <template #body="{ data }: { data: T }">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :aria-label="`Ta bort ${label(data)}`"
            @click="confirmRemove(data)"
          />
        </template>
      </Column>
    </DataTable>

    <template #footer>
      <InputGroup>
        <Select
          v-model="selectedId"
          :options="selectable"
          option-label="label"
          option-value="id"
          :placeholder="placeholder"
          filter
          show-clear
        />
        <Button
          icon="pi pi-plus"
          :label="addLabel"
          :loading="busy"
          :disabled="selectedId === null"
          @click="add"
        />
      </InputGroup>
    </template>
  </Panel>
</template>
