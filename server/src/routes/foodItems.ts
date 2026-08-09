import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

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
  const foodItem = await db.foodItem.findUnique({ where: { id } })
  if (!foodItem) {
    return res.status(404).json({ error: 'Food item not found' })
  }
  return res.json(foodItem)
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

export default router
