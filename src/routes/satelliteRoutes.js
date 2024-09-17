import express from "express";
import { addSatellite, editSatellite, deleteSatellite, getAllSatellites } from "../controllers/satellite.controller.js";

const router = express.Router();


// Route to edit an existing satellite
router.put("/satellite/:id", editSatellite);

// Route to delete a satellite
router.delete("/satellite/:id", deleteSatellite);


router.route("/satellite").get(getAllSatellites).post(addSatellite)

export default router;
