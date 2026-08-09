import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  const restrictions = await db.restriction.findMany({ orderBy: { svName: 'asc' } })
  return res.json(restrictions)
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const restriction = await db.restriction.findUnique({
    where: { id },
    include: { foodItems: { orderBy: { svName: 'asc' } } },
  })
  if (!restriction) {
    return res.status(404).json({ error: 'Restriktionen kunde inte hittas.' })
  }
  return res.json(restriction)
})

router.post('/new', async (req, res) => {
  const { name } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Ett namn krävs.' })
  }
  const restriction = await db.restriction.create({ data: { svName: name } })
  return res.json(restriction)
})

router.post('/:id/food-items', async (req, res) => {
  const id = Number(req.params.id)
  const foodItemId = Number(req.body.foodItemId)
  if (!Number.isInteger(foodItemId)) {
    return res.status(400).json({ error: 'Välj ett livsmedel att lägga till.' })
  }

  const [restriction, foodItem] = await Promise.all([
    db.restriction.findUnique({ where: { id }, include: { foodItems: { select: { id: true } } } }),
    db.foodItem.findUnique({ where: { id: foodItemId } }),
  ])
  if (!restriction) {
    return res.status(404).json({ error: 'Restriktionen kunde inte hittas.' })
  }
  if (!foodItem) {
    return res.status(404).json({ error: 'Livsmedlet kunde inte hittas.' })
  }
  if (restriction.foodItems.some((existing) => existing.id === foodItemId)) {
    return res.status(409).json({ error: 'Livsmedlet är redan med i restriktionen.' })
  }

  await db.restriction.update({
    where: { id },
    data: { foodItems: { connect: { id: foodItemId } } },
  })
  return res.status(201).json(foodItem)
})

router.delete('/:id/food-items/:foodItemId', async (req, res) => {
  const id = Number(req.params.id)
  const foodItemId = Number(req.params.foodItemId)

  const restriction = await db.restriction.findUnique({
    where: { id },
    include: { foodItems: { select: { id: true } } },
  })
  if (!restriction) {
    return res.status(404).json({ error: 'Restriktionen kunde inte hittas.' })
  }
  if (!restriction.foodItems.some((existing) => existing.id === foodItemId)) {
    return res.status(404).json({ error: 'Livsmedlet är inte med i restriktionen.' })
  }

  await db.restriction.update({
    where: { id },
    data: { foodItems: { disconnect: { id: foodItemId } } },
  })
  return res.status(204).send()
})

export default router
