import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import foodItemsRouter from './routes/foodItems.ts'
import peopleRouter from './routes/people.ts'
import restrictionsRouter from './routes/restrictions.ts'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())
app.use(cors())

app.get('/api/health', (req, res) => res.send({ status: 'ok' }))
app.use('/api/food-items', foodItemsRouter)
app.use('/api/people', peopleRouter)
app.use('/api/restrictions', restrictionsRouter)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
