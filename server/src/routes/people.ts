import express from 'express'
import { db } from '../prisma/db.ts'
import { evaluateFoodItems } from '../foodItems/restrictions.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  const people = await db.person.findMany({ orderBy: { name: 'asc' } })
  return res.json(people)
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const person = await db.person.findUnique({
    where: { id },
    include: { restrictions: { orderBy: { svName: 'asc' } } },
  })
  if (!person) {
    return res.status(404).json({ error: 'Personen kunde inte hittas.' })
  }
  return res.json(person)
})

router.post('/new', async (req, res) => {
  const { name } = req.body
  if (!name) {
    return res.status(400).json({ error: 'Ett namn krävs.' })
  }
  const person = await db.person.create({ data: { name } })
  return res.json(person)
})

router.post('/:id/restrictions', async (req, res) => {
  const id = Number(req.params.id)
  const restrictionId = Number(req.body.restrictionId)
  if (!Number.isInteger(restrictionId)) {
    return res.status(400).json({ error: 'Välj en restriktion att lägga till.' })
  }

  const [person, restriction] = await Promise.all([
    db.person.findUnique({ where: { id }, include: { restrictions: { select: { id: true } } } }),
    db.restriction.findUnique({ where: { id: restrictionId } }),
  ])
  if (!person) {
    return res.status(404).json({ error: 'Personen kunde inte hittas.' })
  }
  if (!restriction) {
    return res.status(404).json({ error: 'Restriktionen kunde inte hittas.' })
  }
  if (person.restrictions.some((existing) => existing.id === restrictionId)) {
    return res.status(409).json({ error: 'Personen har redan den restriktionen.' })
  }

  await db.person.update({
    where: { id },
    data: { restrictions: { connect: { id: restrictionId } } },
  })
  return res.status(201).json(restriction)
})

router.delete('/:id/restrictions/:restrictionId', async (req, res) => {
  const id = Number(req.params.id)
  const restrictionId = Number(req.params.restrictionId)

  const person = await db.person.findUnique({
    where: { id },
    include: { restrictions: { select: { id: true } } },
  })
  if (!person) {
    return res.status(404).json({ error: 'Personen kunde inte hittas.' })
  }
  if (!person.restrictions.some((existing) => existing.id === restrictionId)) {
    return res.status(404).json({ error: 'Personen har inte den restriktionen.' })
  }

  await db.person.update({
    where: { id },
    data: { restrictions: { disconnect: { id: restrictionId } } },
  })
  return res.status(204).send()
})

/**
 * Every food item, and whether this person can eat it.
 *
 * A food item is off limits when it, or anything it leads to through its
 * relations, is part of one of the person's restrictions.
 */
router.get('/:id/food-items', async (req, res) => {
  const id = Number(req.params.id)
  const person = await db.person.findUnique({
    where: { id },
    include: { restrictions: { include: { foodItems: { select: { id: true } } } } },
  })
  if (!person) {
    return res.status(404).json({ error: 'Personen kunde inte hittas.' })
  }

  const [foodItems, relations] = await Promise.all([
    db.foodItem.findMany({ orderBy: { svName: 'asc' } }),
    db.foodItemRelation.findMany({ select: { fromId: true, toId: true, optional: true } }),
  ])

  // Which of the person's restrictions each restricted food item comes from.
  const restrictionsByFoodItem = new Map<number, { id: number; svName: string }[]>()
  for (const restriction of person.restrictions) {
    for (const foodItem of restriction.foodItems) {
      const existing = restrictionsByFoodItem.get(foodItem.id)
      const summary = { id: restriction.id, svName: restriction.svName }
      if (existing) {
        existing.push(summary)
      } else {
        restrictionsByFoodItem.set(foodItem.id, [summary])
      }
    }
  }

  const byId = new Map(foodItems.map((foodItem) => [foodItem.id, foodItem]))
  const verdicts = evaluateFoodItems(
    foodItems.map((foodItem) => foodItem.id),
    relations,
    restrictionsByFoodItem.keys(),
  )

  return res.json(
    verdicts.map((verdict) => ({
      foodItem: byId.get(verdict.foodItemId),
      verdict: verdict.verdict,
      reasons: verdict.hits.map((hit) => ({
        foodItem: byId.get(hit.foodItemId),
        restrictions: restrictionsByFoodItem.get(hit.foodItemId) ?? [],
        optional: hit.optional,
        path: hit.path.map((pathId) => byId.get(pathId)),
      })),
    })),
  )
})

export default router
