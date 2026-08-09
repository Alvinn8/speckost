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
    return res.status(404).json({ error: 'Livsmedlet kunde inte hittas.' })
  }
  const { relationsAsParent, ...rest } = foodItem
  return res.json({ ...rest, children: relationsAsParent })
})

router.post('/:id/children', async (req, res) => {
  const id = Number(req.params.id)
  const childId = Number(req.body.childId)
  const relationType = req.body.relationType as RelationType
  const optional = Boolean(req.body.optional)

  if (!Number.isInteger(childId)) {
    return res.status(400).json({ error: 'Välj ett livsmedel att lägga till.' })
  }
  if (childId === id) {
    return res.status(400).json({ error: 'Ett livsmedel kan inte ha en relation till sig självt.' })
  }
  if (!relationTypes.includes(relationType)) {
    return res.status(400).json({ error: 'Okänd relationstyp.' })
  }

  const [parent, child] = await Promise.all([
    db.foodItem.findUnique({ where: { id } }),
    db.foodItem.findUnique({ where: { id: childId } }),
  ])
  if (!parent) {
    return res.status(404).json({ error: 'Livsmedlet kunde inte hittas.' })
  }
  if (!child) {
    return res.status(404).json({ error: 'Livsmedlet som relationen pekar på kunde inte hittas.' })
  }

  const existing = await db.foodItemRelation.findFirst({
    where: { fromId: id, toId: childId, relationType },
  })
  if (existing) {
    return res.status(409).json({ error: 'Relationen finns redan.' })
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
    return res.status(404).json({ error: 'Relationen kunde inte hittas.' })
  }

  await db.foodItemRelation.delete({ where: { id: relationId } })
  return res.status(204).send()
})

router.post('/new', async (req, res) => {
  const { name, type } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Ett namn krävs.' })
  }
  const foodItem = await db.foodItem.create({
    data: {
      svName: name,
      type: type,
    },
  })
  return res.json(foodItem)
})

export default router
