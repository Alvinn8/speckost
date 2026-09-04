import express from 'express'
import { db } from '../prisma/db.ts'
import { FoodItemRelationType, FoodItemType } from '@prisma/client'

const router = express.Router()

interface FoodItemCategory {
  id: number
  svName: string
  enName: string | null
  optional: boolean
}

interface CategoryRow {
  foodItemId: number
  categoryId: number
  categorySvName: string
  categoryEnName: string | null
  optional: boolean
}

async function fetchCategoriesByFoodItemId(
  originId?: number,
): Promise<Map<number, FoodItemCategory[]>> {
  const originFilter = Number(originId) ?? null
  const rows = await db.$queryRaw<CategoryRow[]>`
    WITH RECURSIVE reachable("originId", "reachedId", mandatory) AS (
      SELECT
        r."fromId" AS "originId",
        r."toId"   AS "reachedId",
        (NOT r.optional) AS mandatory
      FROM "FoodItemRelation" r
      WHERE ${originFilter}::int IS NULL OR r."fromId" = ${originFilter}::int

      UNION

      SELECT
        reachable."originId",
        r."toId" AS "reachedId",
        (NOT r.optional AND reachable.mandatory) AS mandatory
      FROM reachable
      JOIN "FoodItemRelation" r ON r."fromId" = reachable."reachedId"
    )
    SELECT
      reachable."originId" AS "foodItemId",
      fi.id                AS "categoryId",
      fi."svName"          AS "categorySvName",
      fi."enName"          AS "categoryEnName",
      NOT bool_or(reachable.mandatory) AS optional
    FROM reachable
    JOIN "FoodItem" fi ON fi.id = reachable."reachedId"
    WHERE fi.type = 'CATEGORY'::"FoodItemType"
    GROUP BY reachable."originId", fi.id, fi."svName", fi."enName"
    ORDER BY reachable."originId", fi."svName"
  `

  const map = new Map<number, FoodItemCategory[]>()
  for (const row of rows) {
    const list = map.get(row.foodItemId) ?? []
    list.push({
      id: row.categoryId,
      svName: row.categorySvName,
      enName: row.categoryEnName,
      optional: row.optional,
    })
    map.set(row.foodItemId, list)
  }
  return map
}

function withCategories<T extends { id: number }>(
  item: T,
  categoriesMap: Map<number, FoodItemCategory[]>,
): T & { categories: FoodItemCategory[] } {
  return { ...item, categories: categoriesMap.get(item.id) ?? [] }
}

router.get('/', async (req, res) => {
  const typeFilter = String(req.query.type) as FoodItemType
  const where = Object.values(FoodItemType).includes(typeFilter) ? { type: typeFilter } : undefined
  const [foodItems, categoriesMap] = await Promise.all([
    db.foodItem.findMany({ where, orderBy: { id: 'desc' } }),
    fetchCategoriesByFoodItemId(),
  ])
  return res.json(foodItems.map((item) => withCategories(item, categoriesMap)))
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const [foodItem, categoriesMap] = await Promise.all([
    db.foodItem.findUnique({
      where: { id },
      include: {
        relationsAsParent: {
          include: { child: true },
          orderBy: { id: 'asc' },
        },
      },
    }),
    fetchCategoriesByFoodItemId(),
  ])
  if (!foodItem) {
    return res.status(404).json({ error: 'Food item not found' })
  }
  const { relationsAsParent, ...rest } = foodItem
  return res.json({
    ...withCategories(rest, categoriesMap),
    children: relationsAsParent.map((item) => ({
      ...item,
      child: withCategories(item.child, categoriesMap),
    })),
  })
})

router.post('/new', async (req, res) => {
  const { name, type } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }
  const foodItem = await db.foodItem.create({
    data: {
      svName: name,
      type: type,
    },
  })
  return res.json(foodItem)
})

router.post('/:id/children', async (req, res) => {
  const id = Number(req.params.id)
  const childId = Number(req.body.childId)
  const relationType = req.body.relationType as FoodItemRelationType
  const optional = Boolean(req.body.optional)

  if (childId === id) {
    return res.status(400).json({ error: 'A food item cannot be related to itself' })
  }

  const [parent, child] = await Promise.all([
    db.foodItem.findUnique({ where: { id } }),
    db.foodItem.findUnique({ where: { id: childId } }),
  ])
  if (!parent || !child) {
    return res.status(404).json({ error: 'Food item not found' })
  }

  const existing = await db.foodItemRelation.findFirst({
    where: { fromId: id, toId: childId, relationType },
  })
  if (existing) {
    return res.status(409).json({ error: 'That relation already exists' })
  }

  const relation = await db.foodItemRelation.create({
    data: { fromId: id, toId: childId, relationType, optional },
    include: { child: true },
  })
  return res.status(201).json(relation)
})

router.post('/:id/children/bulk', async (req, res) => {
  const id = Number(req.params.id)
  const foodItemIds = req.body.foodItemIds as number[]
  const relationType = req.body.relationType as FoodItemRelationType
  const optional = Boolean(req.body.optional)

  const parent = await db.foodItem.findUnique({ where: { id } })
  if (!parent) {
    return res.status(404).json({ error: 'Food item not found' })
  }

  const existing = await db.foodItemRelation.findMany({
    where: { fromId: id, toId: { in: foodItemIds } },
  })
  const newIds = foodItemIds.filter((foodItemId) => !existing.some((e) => e.toId === foodItemId))
  const newRelations = await db.foodItemRelation.createMany({
    data: newIds.map((id) => ({
      fromId: parent.id,
      toId: id,
      relationType,
      optional,
    })),
  })

  return res.status(201).json(newRelations)
})

router.delete('/:id/children/:relationId', async (req, res) => {
  const id = Number(req.params.id)
  const relationId = Number(req.params.relationId)

  const relation = await db.foodItemRelation.findUnique({ where: { id: relationId } })
  if (!relation || relation.fromId !== id) {
    return res.status(404).json({ error: 'Relation not found' })
  }

  await db.foodItemRelation.delete({ where: { id: relationId } })
  return res.status(204).send()
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { svName, enName, svDescription, enDescription, type } = req.body

  const foodItem = await db.foodItem.findUnique({ where: { id } })
  if (!foodItem) {
    return res.status(404).json({ error: 'Food item not found' })
  }

  const updatedFoodItem = await db.foodItem.update({
    where: { id },
    data: { svName, enName, svDescription, enDescription, type },
  })
  return res.json(updatedFoodItem)
})

export default router
