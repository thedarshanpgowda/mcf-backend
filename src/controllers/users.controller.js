import { apiResponse } from "../config/apiResponse.js"
import isAuthorised from "../config/CheckAuthority.js"
import { profileModel } from "../models/profiles.js"

const userRetrieve = async (req, res) => {
    try {
        if (isAuthorised(req)) {
            const users = await profileModel.find({})
            if (users.length === 0) {
                return res.json(new apiResponse(200, "No users found", {})).status(200)
            }
            return res.json(new apiResponse(200, "Users retrieved succesfully", users))
        }
        else {
            res.json(new apiResponse(403, "User not authorised", {})).status(403)
        }
    }
    catch (e) {
        console.log(e)
        return res.json(new apiResponse()).status(500)
    }
}


export { userRetrieve }