import express from 'express'
import { db } from '../prisma/db.ts'
import { checkCompatibility } from '../util/compatibility.ts'

const router = express.Router()

router.post('/compatibility', async (req, res) => {
  const { personIds, foodItemIds } = req.body

  if (!Array.isArray(personIds) || !Array.isArray(foodItemIds)) {
    return res.status(400).json({ error: 'personIds and foodItemIds must be arrays' })
  }

  const compatibilityResults = await checkCompatibility(personIds, foodItemIds)
  return res.json(compatibilityResults)
})

export default router
