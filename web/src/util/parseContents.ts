import type { FoodItem } from '@/api/types'

// Parse "Innehållsförteckning"
export function parseContents(text: string, allFoodItems: FoodItem[]): ParseResult {
  const originalText = text
  const parts = text
    .split(/\n|\.|(,(?![^(]*\)))/) // split on new line, period, or comma (but not commas inside parentheses)
    .map((item) => clean(item))
    .filter((item) => Boolean(item) && item !== 'undefined' && item !== ',')
  console.log(parts)

  const lookup = createLookup(allFoodItems)
  const entries: ParseEntry[] = []

  for (const part of parts) {
    let foodItem = lookup.get(part)
    if (foodItem) {
      entries.push({ text: part, foodItem })
      continue
    }
    let found = false
    for (const transform of transformations) {
      const transformed = transform(part)
      if (!transformed) continue
      const entriesForTransformed: ParseEntry[] = []
      for (const item of transformed) {
        foodItem = lookup.get(item)
        entriesForTransformed.push({ text: item, untransformedText: part, foodItem })
        if (foodItem) found = true
      }
      if (found) {
        entries.push(...entriesForTransformed)
        break
      }
    }
    // Nothing matched :(
    entries.push({ text: part, foodItem: undefined })
  }
  return {
    originalText,
    entries,
  }
}

export type ParseResult = {
  originalText: string
  entries: ParseEntry[]
}

export type ParseEntry = {
  text: string
  untransformedText?: string
  foodItem?: FoodItem
}

function clean(str: string) {
  return String(str)
    .trim()
    .toLowerCase()
    .replaceAll(/^[-*+•]\s*/g, '') // Remove list prefixes
    .replaceAll(/(\d+)%/g, '') // Remove percentages
    .replaceAll(/\.$/g, '') // Remove trailing dot
    .replaceAll(/\*$/g, '') // Remove trailing asterisk
    .trim()
}

function createLookup(allFoodItems: FoodItem[]) {
  const lookup = new Map<string, FoodItem>()
  for (const foodItem of allFoodItems) {
    lookup.set(foodItem.svName.toLowerCase(), foodItem)
    // TODO create aliases
    // if (foodItem.aliases) {
    //   for (const alias of foodItem.aliases) {
    //     lookup.set(alias.toLowerCase(), foodItem)
    //   }
    // }
  }
  return lookup
}

type Transformation = (str: string) => string[] | null

const transformations: Transformation[] = [
  // Convert "vegetabilisk olja (raps, solros)" to ["rapsolja", "solrosolja"]
  (str: string) => {
    const result = str.match(/(?<main>vegetabilisk olja|vegetabiliska oljor)\((?<paren>).+\)/)
    if (!result?.groups?.['main'] || !result?.groups['paren']) return null
    return result.groups['paren']
      .split(',')
      .map((item) => clean(item))
      .map((item) => (item.endsWith('olja') ? item : `${item}olja`))
  },
  // Convert "main (x, y, z)" to ["main", "x", "y", "z"]
  (str: string) => {
    const result = str.match(/(?<main>.+)\((?<paren>.+)\)/)
    if (!result?.groups?.['main'] || !result?.groups['paren']) return null
    const main = clean(result.groups['main'])
    const paren = result.groups['paren'].split(',').map((item) => clean(item))
    return [main, ...paren]
  },
  // Convert "a/b" to ["a", "b"]
  (str: string) => {
    if (!str.includes('/')) return null
    return str.split('/').map((item) => clean(item))
  },
  // Convert "a och b" to ["a", "b"]
  (str: string) => {
    if (!str.includes(' och ')) return null
    return str.split(' och ').map((item) => clean(item))
  },
]
