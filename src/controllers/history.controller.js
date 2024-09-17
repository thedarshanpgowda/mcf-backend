import { apiResponse } from "../config/apiResponse.js"
import isAuthorised from "../config/CheckAuthority.js"
import historyModel from "../models/History.js"


const historyRetrieve = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const history = await historyModel.find({})
            if (history.length === 0) {
                return res.json(new apiResponse(200, "No history to fetch", {})).status(200)
            }

            return res.json(new apiResponse(200, "History retrieved successfully", history)).status(200)
        }

        else {
            return res.json(new apiResponse(403, "User is not authorised", {})).status(403)
        }
    }
    catch (er) {
        console.log(er)
        return res.json(new apiResponse()).status(500)
    }
}

export { historyRetrieve }