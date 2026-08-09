import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

const relationTypes = ['CONTAINS', 'IS_A'] as const
type RelationType = (typeof relationTypes)[number]

router.get('/', async (req, res) => {
  const foodItems = await db.foodItem.findMany({ orderBy: { svName: 'asc' } })
  return res.json(foodItems)
})

router.get('/categories', async (req, res) => {
  const categories = await db.foodItem.findMany({ where: { type: 'CATEGORY' } })
  return res.json(categories)
})

router.get('/normal', async (req, res) => {
  const normalItems = await db.foodItem.findMany({ where: { type: 'NORMAL' } })
  return res.json(normalItems)
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const foodItem = await db.foodItem.findUnique({
    where: { id },
    include: {
      relationsAsParent: {
        include: { child: true },
        orderBy: { id: 'asc' },
      },
    },
  })
  if (!foodItem) {
    return res.status(404).json({ error: 'Food item not found' })
  }
  const { relationsAsParent, ...rest } = foodItem
  return res.json({ ...rest, children: relationsAsParent })
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
  const relationType = req.body.relationType as RelationType
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
  const { svName, enName, svDescription, enDescription } = req.body

  const foodItem = await db.foodItem.findUnique({ where: { id } })
  if (!foodItem) {
    return res.status(404).json({ error: 'Food item not found' })
  }

  const updatedFoodItem = await db.foodItem.update({
    where: { id },
    data: { svName, enName, svDescription, enDescription },
  })
  return res.json(updatedFoodItem)
})

export default router
