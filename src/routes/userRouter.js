import { Router } from 'express';
import { userRetrieve } from '../controllers/users.controller.js';
import { verifyToken } from '../controllers/token.controller.js';

const router = Router();

router.route(verifyToken)
router.route('/').get(userRetrieve)

export default router