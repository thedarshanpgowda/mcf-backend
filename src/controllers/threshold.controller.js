import { apiResponse } from "../config/apiResponse.js";
import isAuthorised from "../config/CheckAuthority.js";
import Threshold from "../models/thresholds.js";

// Add a new threshold

const addThreshold = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const id = "66e414f1944b8a64a6c0118c"; // ID of the document to update
            const { value } = req.body;

            if (!value || !value.key) {
                return res.json(new apiResponse(400, "Invalid input data", {})).status(400);
            }

            // Extracting fields from the value object
            const { key, min, max, gsat, selectedPid, value: val } = value;

            console.log({ key, min, max, gsat, selectedPid });

            // Build update data based on the key
            const updateData = {};
            switch (key) {
                case "roll":
                    if (min !== undefined && max !== undefined) {
                        updateData['roll.min'] = min;
                        updateData['roll.max'] = max;
                    }
                    break;
                case "pitch":
                    if (min !== undefined && max !== undefined) {
                        updateData['pitch.min'] = min;
                        updateData['pitch.max'] = max;
                    }
                    break;
                case "yaw":
                    if (min !== undefined && max !== undefined) {
                        updateData['yaw.min'] = min;
                        updateData['yaw.max'] = max;
                    }
                    break;
                case "samplingTime":
                    if (min !== undefined && max !== undefined) {
                        updateData['samplingTime.min'] = min;
                        updateData['samplingTime.max'] = max;
                    }
                    break;
                case "period":
                    if (val !== undefined) {
                        updateData['period'] = val;
                    }
                    break;
                case "gsat":
                    if (gsat !== undefined) {
                        updateData['gsat'] = gsat;
                    }
                    if (selectedPid !== undefined) {
                        updateData['selectedPid'] = selectedPid;
                    }
                    break;
                default:
                    return res.json(new apiResponse(400, "Invalid key", {})).status(400);
            }

            // Perform the update operation
            const updatedThreshold = await Threshold.findOneAndUpdate(
                { id: id },
                { $set: updateData },
                { new: true }  // Return the updated document
            );

            if (!updatedThreshold) {
                return res.json(new apiResponse(404, "Threshold not found", {})).status(404);
            }

            return res.json(new apiResponse(200, "Threshold updated successfully", updatedThreshold)).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};




// Edit an existing threshold
const editThreshold = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const { id } = req.params;
            const threshold = await Threshold.findByIdAndUpdate(id, req.body, { new: true });
            if (!threshold) {
                return res.json(new apiResponse(404, "Threshold not found", {})).status(404);
            }
            return res.json(new apiResponse(200, "Threshold updated successfully", threshold)).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

// Delete a threshold
const deleteThreshold = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const { id } = req.params;
            const threshold = await Threshold.findByIdAndDelete(id);
            if (!threshold) {
                return res.json(new apiResponse(404, "Threshold not found", {})).status(404);
            }
            return res.json(new apiResponse(200, "Threshold deleted successfully", {})).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

// Get all thresholds
const getAllThresholds = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const thresholds = await Threshold.find();
            if (thresholds.length === 0) {
                return res.json(new apiResponse(200, "No thresholds found", {})).status(200);
            }
            return res.json(new apiResponse(200, "Thresholds retrieved successfully", thresholds)).status(200);
        } else {
            return res.json(new apiResponse(403, "User not authorised", {})).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.json(new apiResponse(500, "Internal Server Error", {})).status(500);
    }
};

export { addThreshold, editThreshold, deleteThreshold, getAllThresholds };
