import { apiResponse } from "../config/apiResponse.js"
import jwt from 'jsonwebtoken'

async function verifyToken(req, res, next) {
    try {

        const { jwtToken } = req.cookies
        if (!jwtToken) {
            return res.json(new apiResponse(403, "User must login, no token found", {})).status(403)
        }

        jwt.verify(jwtToken, process.env.JWT_SECRET_TOKEN,
            (err, userDetails) => {
                if (err) {
                    return res.json(new apiResponse(403, "NO token found", {})).status(403)
                }
                req.user = userDetails
                next()
            }
        )

    }
    catch (e) {
        console.log(e)
        return res.json(new apiResponse()).status(500)
    }
}

export { verifyToken }