import { Router } from "express";
import { historyRetrieve } from "../controllers/history.controller.js";
import { verifyToken } from "../controllers/token.controller.js";

const router = Router();

router.route(verifyToken)

router.route("/").get(historyRetrieve)

export default router