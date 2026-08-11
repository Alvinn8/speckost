import { useToast } from 'primevue'

export async function parsePastedTable(e: ClipboardEvent, toast: ReturnType<typeof useToast>) {
  const html = e.clipboardData?.getData('text/html')
  if (!html) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Ingen HTML-data hittades i urklippet',
    })
    return
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Ingen tabell hittades i urklippet',
    })
    return
  }
  const nameColumnIndex = Array.from(table.rows[0]?.cells ?? []).findIndex((cell) =>
    cell.textContent?.toLowerCase().includes('namn'),
  )
  if (nameColumnIndex === -1) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Ingen kolumn med rubriken "Namn" hittades i tabellen',
    })
    return
  }
  const restrictionColumnIndex = Array.from(table.rows[0]?.cells ?? []).findIndex((cell) =>
    cell.textContent?.toLowerCase().includes('matpreferenser'),
  )
  if (restrictionColumnIndex === -1) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Ingen kolumn med rubriken "Matpreferenser" hittades i tabellen',
    })
    return
  }
  const people: { name: string; restrictions: never[] }[] = []
  const rows = Array.from(table.rows).slice(1)
  for (const row of rows) {
    const name = row.cells[nameColumnIndex]?.textContent?.trim()
    const restrictions =
      row.cells[restrictionColumnIndex]?.textContent
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) || []
    // TODO parse restrictions and/or ask user to confirm.
    if (restrictions.length > 0) {
      console.log(`Found restrictions for ${name}: ${restrictions.join(', ')}`)
    }
    if (name) {
      people.push({ name, restrictions: [] })
    }
  }
  return people
}
