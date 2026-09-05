import express from 'express'
import { db } from '../prisma/db.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  return res.json(await db.personGroup.findMany({ orderBy: { id: 'desc' } }))
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const group = await db.personGroup.findUnique({
    where: { id },
    include: {
      people: { include: { restrictions: { include: { restriction: true } } } },
      subGroups: true,
      parentGroups: true,
    },
  })
  if (!group) return res.status(404).json({ error: 'Group not found' })
  return res.json(group)
})

router.post('/new', async (req, res) => {
  const { name } = req.body
  const group = await db.personGroup.create({
    data: {
      svName: name,
    },
  })
  return res.json(group)
})

router.get('/:id/all-people', async (req, res) => {
  // Fetch all people recursively in this group and its subgroups
  const groupId = Number(req.params.id)
  const allPeople = new Set<number>()
  const queue: number[] = [groupId]

  while (queue.length > 0) {
    const currentGroupId = queue.shift()!
    const currentGroup = await db.personGroup.findUnique({
      where: { id: currentGroupId },
      include: {
        people: true,
        subGroups: true,
      },
    })
    if (currentGroup) {
      currentGroup.people.forEach((person) => allPeople.add(person.id))
      currentGroup.subGroups.forEach((subGroup) => queue.push(subGroup.id))
    }
  }

  const peopleList = await db.person.findMany({
    where: { id: { in: Array.from(allPeople) } },
    include: { restrictions: { include: { restriction: true } } },
  })

  return res.json(peopleList)
})

router.post('/:id/person', async (req, res) => {
  const groupId = Number(req.params.id)
  const { personId } = req.body
  await db.personGroup.update({
    where: { id: groupId },
    data: {
      people: {
        connect: { id: personId },
      },
    },
  })
  return res.status(204).send()
})

router.post('/:id/person/bulk', async (req, res) => {
  const groupId = Number(req.params.id)
  const { personIds } = req.body
  await db.personGroup.update({
    where: { id: groupId },
    data: {
      people: {
        connect: personIds.map((id: number) => ({ id })),
      },
    },
  })
  return res.status(204).send()
})

router.delete('/:id/person/:personId', async (req, res) => {
  const groupId = Number(req.params.id)
  const personId = Number(req.params.personId)
  await db.personGroup.update({
    where: { id: groupId },
    data: {
      people: {
        disconnect: { id: personId },
      },
    },
  })
  return res.status(204).send()
})

router.post('/:id/sub-group', async (req, res) => {
  const groupId = Number(req.params.id)
  const { subGroupId } = req.body
  await db.personGroup.update({
    where: { id: groupId },
    data: {
      subGroups: {
        connect: { id: subGroupId },
      },
    },
  })
  return res.status(204).send()
})

router.delete('/:id/sub-group/:subGroupId', async (req, res) => {
  const groupId = Number(req.params.id)
  const subGroupId = Number(req.params.subGroupId)
  await db.personGroup.update({
    where: { id: groupId },
    data: {
      subGroups: {
        disconnect: { id: subGroupId },
      },
    },
  })
  return res.status(204).send()
})

export default router
