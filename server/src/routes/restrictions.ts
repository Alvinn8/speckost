import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  return res.json(
    await db.restriction.findMany({ orderBy: { svName: 'asc' }, include: { foodItems: true } }),
  )
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const restriction = await db.restriction.findUnique({
    where: { id },
    include: {
      foodItems: true,
    },
  })
  if (!restriction) return res.status(404).json({ error: 'Restriction not found' })
  return res.json(restriction)
})

router.post('/new', async (req, res) => {
  const { name } = req.body
  const restriction = await db.restriction.create({
    data: {
      svName: name,
    },
  })
  return res.json(restriction)
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name } = req.body
  const restriction = await db.restriction.update({
    where: { id },
    data: {
      svName: name,
    },
  })
  return res.json(restriction)
})

router.post('/:id/food-items', async (req, res) => {
  const restrictionId = Number(req.params.id)
  const { foodItemId } = req.body
  await db.restriction.update({
    where: { id: restrictionId },
    data: {
      foodItems: {
        connect: { id: foodItemId },
      },
    },
  })
  return res.status(204).send()
})

router.delete('/:id/food-items/:foodItemId', async (req, res) => {
  const restrictionId = Number(req.params.id)
  const foodItemId = Number(req.params.foodItemId)
  await db.restriction.update({
    where: { id: restrictionId },
    data: {
      foodItems: {
        disconnect: { id: foodItemId },
      },
    },
  })
  return res.status(204).send()
})

export default router
