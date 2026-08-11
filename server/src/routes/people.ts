import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  return res.json(
    await db.person.findMany({
      orderBy: { name: 'asc' },
      include: { restrictions: { include: { restriction: true } } },
    }),
  )
})

router.post('/new', async (req, res) => {
  const { name } = req.body
  const person = await db.person.create({
    data: {
      name,
    },
  })
  return res.json(person)
})

router.post('/bulk', async (req, res) => {
  const { people } = req.body
  const createdPeople = await db.person.createManyAndReturn({
    data: people.map((p: { name: string }) => ({ name: p.name })),
  })
  return res.json(createdPeople.map((person) => ({ ...person, restrictions: [] })))
})

router.post('/:id/restrictions', async (req, res) => {
  const personId = Number(req.params.id)
  const { restrictionId } = req.body
  const personRestriction = await db.personRestriction.create({
    data: {
      personId,
      restrictionId,
    },
    include: {
      restriction: true,
    },
  })
  await db.person.update({
    where: { id: personId },
    data: {
      restrictions: {
        connect: { id: personRestriction.id },
      },
    },
  })
  return res.json(personRestriction)
})

router.delete('/:id/restrictions/:personRestrictionId', async (req, res) => {
  const personId = Number(req.params.id)
  const personRestrictionId = Number(req.params.personRestrictionId)
  await db.person.update({
    where: { id: personId },
    data: {
      restrictions: {
        disconnect: { id: personRestrictionId },
      },
    },
  })
  await db.personRestriction.delete({
    where: { id: personRestrictionId },
  })
  return res.status(204).send()
})

export default router
