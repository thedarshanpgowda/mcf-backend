import { config } from 'dotenv'
import { Router } from 'express'
import { addPeople, deleteUser, login, logout, refresh, updateUserInfo } from '../controllers/login.controller.js'

const router = Router()


config()

router.route("/login").post(login).delete(logout)
router.route("/addPeople").post(addPeople)
router.route("/deletePeople").post(deleteUser)
router.route("/refresh").get(refresh)
router.route("/updateUser").post(updateUserInfo)

export default router