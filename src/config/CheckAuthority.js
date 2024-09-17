import jwt from "jsonwebtoken";

async function isAuthorised(req) {
    try {
        const { jwtToken } = req.cookies;
        console.log(jwtToken)
        if (!jwtToken) {
            return false;
        }
        const payload = await jwt.decode(jwtToken, process.env.JWT_SECRET_TOKEN);
        const { level } = payload;

        console.log(level);
        return level === 2;
    } catch (e) {
        console.error("Authorization error:", e);
        return false;
    }
}

export default isAuthorised;
