import express from "express";
import { addThreshold, editThreshold, deleteThreshold, getAllThresholds } from "../controllers/threshold.controller.js";

const router = express.Router();

// Route to add a new threshold
router.post("/", addThreshold);

// Route to edit an existing threshold
router.put("/threshold/:id", editThreshold);

// Route to delete a threshold
router.delete("/threshold/:id", deleteThreshold);

// Route to get all thresholds
router.get("/", getAllThresholds);


router.post('/pitch', addThreshold)
router.post('/roll', addThreshold)
router.post('/yaw', addThreshold)
router.post('/samplingTime', addThreshold)
router.post('/period', addThreshold)
router.post('/gsat', addThreshold)


export default router;
