import express from 'express'
import loginRouter from './routes/loginRoute.js'
import dataRouter from './routes/data.route.js'
import historyRouter from './routes/history.route.js'
import usersRouter from './routes/userRouter.js'
import satelliteRouter from './routes/satelliteRoutes.js'
import thresholdRouter from './routes/thresholdRoutes.js'

import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express()


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
app.use(cookieParser())

app.use("/", loginRouter)
app.use("/check-details", dataRouter)
app.use("/history", historyRouter)
app.use("/users", usersRouter)
app.use("/gsat", satelliteRouter)
app.use('/threshold', thresholdRouter)
export default app