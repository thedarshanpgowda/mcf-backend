import { Router } from 'express'
import processData from '../controllers/newco.js'
import { verifyToken } from '../controllers/token.controller.js'
const router = Router()

// router.route(verifyToken)

router.route('/').post(processData)

export default router