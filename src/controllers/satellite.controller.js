import { apiResponse } from "../config/apiResponse.js";
import isAuthorised from "../config/CheckAuthority.js";
import Satellite from "../models/gsat.js";

// Add a new satellite
const addSatellite = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const { pids, gsat } = req.body
            if(!pids || !gsat.length===0){
                return res.json(new apiResponse(400, "Necessary details required", {}))
            }
            const addDetails = await Satellite.create({
                gsat, pids
            })
            if(!addDetails){
                return res.json(new apiResponse(400, "Unable to add to the database",{}))
            }
            return res.json(new apiResponse(201, "Satellite added successfully", addDetails)).status(201);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

// Edit an existing satellite
const editSatellite = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const { id } = req.params;
            const satellite = await Satellite.findByIdAndUpdate(id, req.body, { new: true });
            if (!satellite) {
                return res.json(new apiResponse(404, "Satellite not found", {})).status(404);
            }
            return res.json(new apiResponse(200, "Satellite updated successfully", satellite)).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

// Delete a satellite
const deleteSatellite = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const { id } = req.params;
            const satellite = await Satellite.findByIdAndDelete(id);
            if (!satellite) {
                return res.json(new apiResponse(404, "Satellite not found", {})).status(404);
            }
            return res.json(new apiResponse(200, "Satellite deleted successfully", {})).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

// Get all satellites
const getAllSatellites = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const satellites = await Satellite.find({});
            // console.log(satellites)
            if (satellites.length === 0) {
                return res.json(new apiResponse(200, "No satellites found", {})).status(200);
            }
            return res.json(new apiResponse(200, "Satellites retrieved successfully", satellites)).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

export { addSatellite, editSatellite, deleteSatellite, getAllSatellites };
