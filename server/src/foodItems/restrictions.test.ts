import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateFoodItem, evaluateFoodItems, type Relation } from './restrictions.ts'

/** Falafel wrap -> falafel -> chickpeas -> legume, plus an optional sauce. */
const WRAP = 1
const FALAFEL = 2
const CHICKPEAS = 3
const LEGUME = 4
const SAUCE = 5
const MILK = 6
const BREAD = 7

const relations: Relation[] = [
  { fromId: WRAP, toId: FALAFEL, optional: false },
  { fromId: WRAP, toId: BREAD, optional: false },
  { fromId: WRAP, toId: SAUCE, optional: true },
  { fromId: FALAFEL, toId: CHICKPEAS, optional: false },
  { fromId: CHICKPEAS, toId: LEGUME, optional: false },
  { fromId: SAUCE, toId: MILK, optional: false },
]

describe('evaluateFoodItem', () => {
  it('finds nothing when no food item is restricted', () => {
    const result = evaluateFoodItem(WRAP, relations, [])
    assert.equal(result.verdict, 'SAFE')
    assert.deepEqual(result.hits, [])
  })

  it('follows the relations all the way down', () => {
    const result = evaluateFoodItem(WRAP, relations, [LEGUME])
    assert.equal(result.verdict, 'UNSAFE')
    assert.deepEqual(result.hits, [
      { foodItemId: LEGUME, path: [WRAP, FALAFEL, CHICKPEAS, LEGUME], optional: false },
    ])
  })

  it('restricts a food item that is restricted itself', () => {
    const result = evaluateFoodItem(LEGUME, relations, [LEGUME])
    assert.equal(result.verdict, 'UNSAFE')
    assert.deepEqual(result.hits[0]?.path, [LEGUME])
  })

  it('leaves food items that share no relations alone', () => {
    assert.equal(evaluateFoodItem(BREAD, relations, [LEGUME]).verdict, 'SAFE')
  })

  it('is unsure about something only reached through an optional relation', () => {
    const result = evaluateFoodItem(WRAP, relations, [MILK])
    assert.equal(result.verdict, 'MAYBE')
    assert.deepEqual(result.hits, [
      { foodItemId: MILK, path: [WRAP, SAUCE, MILK], optional: true },
    ])
  })

  it('is certain again below the optional relation', () => {
    const result = evaluateFoodItem(SAUCE, relations, [MILK])
    assert.equal(result.verdict, 'UNSAFE')
  })

  it('reports every restricted food item it reaches', () => {
    const result = evaluateFoodItem(WRAP, relations, [LEGUME, MILK])
    assert.equal(result.verdict, 'UNSAFE')
    assert.deepEqual(
      result.hits.map((hit) => [hit.foodItemId, hit.optional]),
      [
        [LEGUME, false],
        [MILK, true],
      ],
    )
  })

  it('prefers a required path over an optional one to the same food item', () => {
    const both: Relation[] = [
      { fromId: WRAP, toId: MILK, optional: true },
      { fromId: WRAP, toId: SAUCE, optional: false },
      { fromId: SAUCE, toId: MILK, optional: false },
    ]
    const result = evaluateFoodItem(WRAP, both, [MILK])
    assert.equal(result.verdict, 'UNSAFE')
    assert.deepEqual(result.hits, [
      { foodItemId: MILK, path: [WRAP, SAUCE, MILK], optional: false },
    ])
  })

  it('stops instead of looping when relations form a cycle', () => {
    const cyclic: Relation[] = [
      { fromId: WRAP, toId: FALAFEL, optional: false },
      { fromId: FALAFEL, toId: CHICKPEAS, optional: false },
      { fromId: CHICKPEAS, toId: WRAP, optional: false },
    ]
    const result = evaluateFoodItem(WRAP, cyclic, [CHICKPEAS])
    assert.equal(result.verdict, 'UNSAFE')
    assert.deepEqual(result.hits[0]?.path, [WRAP, FALAFEL, CHICKPEAS])
  })

  it('walks a food item that has no relations at all', () => {
    assert.equal(evaluateFoodItem(99, relations, [LEGUME]).verdict, 'SAFE')
  })
})

describe('evaluateFoodItems', () => {
  it('gives a verdict per food item, in the order asked for', () => {
    const results = evaluateFoodItems([BREAD, WRAP, FALAFEL], relations, [LEGUME])
    assert.deepEqual(
      results.map((result) => [result.foodItemId, result.verdict]),
      [
        [BREAD, 'SAFE'],
        [WRAP, 'UNSAFE'],
        [FALAFEL, 'UNSAFE'],
      ],
    )
  })
})
