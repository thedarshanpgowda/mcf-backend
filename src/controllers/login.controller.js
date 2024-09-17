import { v4 as uuidv4 } from "uuid";
import { apiResponse } from "../config/apiResponse.js";
import { profileModel } from "../models/profiles.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import isAuthorised from "../config/CheckAuthority.js";
import { transporter } from "../config/sendMail.js";

async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json(new apiResponse(400, "Necessary credentials missing", {}));
        }

        const userPresent = await profileModel.findOne({ email });
        if (!userPresent) {
            return res.status(400).json(new apiResponse(400, "User not present", {}));
        }

        const { password: userPassword } = userPresent;
        if (await bcrypt.compare(password, userPassword)) {
            const jwtPayload = {
                name: userPresent.name,
                level: userPresent.level,
                userId: userPresent.userId,
                email: userPresent.email
            };

            console.log(jwtPayload)

            const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET_TOKEN, {
                expiresIn: process.env.JWT_TOKEN_EXPIRY_TIME
            });

            if (!jwtToken) {
                return res.status(500).json(new apiResponse(500, "Token generation failed, try logging again", {}));
            }

            res.cookie('jwtToken', jwtToken, { httpOnly: true });



            console.log(jwtToken)
            // const sendMail = await transporter.sendMail({
            //     to: email,
            //     subject: "Login Successfull",
            //     text: `Hello ${userPresent.name}, \n Login successfull in Satelite control facilty`
            // })

            const sendMail = true


            if (!sendMail) {
                return res.status(400).json(new apiResponse(400, "Unable to send mail", {}))
            }
            return res.status(200).json(new apiResponse(200, "User login successful", { name: userPresent.name, email: userPresent.email, level: userPresent.level }));
        } else {
            return res.status(400).json(new apiResponse(400, "Incorrect credentials", {}));
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json(new apiResponse(500, "Internal server error", {}));
    }
}

async function addPeople(req, res) {
    try {
        const isAuthorized = await isAuthorised(req);
        // const isAuthorized = true;

        if (isAuthorized) {
            const { name, email, level } = req.body;
            const userLevel = Number(level)
            console.log(name, email, userLevel)
            if (!name || !email || isNaN(level)) {
                return res.status(400).json(new apiResponse(400, "Necessary fields are missing", {}));
            }
            const newpassword = email.slice(0, 3) + uuidv4().slice(0, 7)
            const userId = uuidv4();
            const userPassword = await bcrypt.hash(newpassword, 10);

            const newPerson = await profileModel.create({
                name,
                email,
                level: userLevel,
                userId,
                password: userPassword
            });

            if (newPerson) {
                // const sendMailPromise = await transporter.sendMail({
                //     to: email,
                //     subject: `Account created in satellite control`,
                //     text: `Hello ${name}\nWe have created an account for you in satellite control with\nEmail:${email}\nLogin Password: ${newpassword}`,
                // });

                const sendMailPromise = true


                if (sendMailPromise) {
                    return res.status(200).json(new apiResponse(200, "User added successfully and mail sent successfully", {}));
                }
                else {
                    return res.status(400).json(new apiResponse(400, "Unable to send mail", {}))
                }
            } else {
                return res.status(400).json(new apiResponse(400, "Unable to create a user", {}));
            }
        } else {
            return res.status(403).json(new apiResponse(403, "User not authorised to perform this task", {}));
        }
    } catch (e) {
        console.log(e);
        if (e.code === 11000 && e.keyPattern.email) {
            return res.status(400).json(new apiResponse(400, "Email already exists", {}));
        }
        return res.status(500).json(new apiResponse(500, "Internal server error", {}));
    }
}

async function logout(req, res) {
    try {
        const { jwtToken } = req.cookies;

        if (!jwtToken) {
            return res.status(400).json(new apiResponse(400, "No token found, user not logged in"));
        }

        res.clearCookie("jwtToken");

        return res.status(200).json(new apiResponse(200, "User logged out successfully"));
    } catch (e) {
        console.log(e);
        return res.status(500).json(new apiResponse(500, "Internal server error"));
    }
}
async function deleteUser(req, res) {
    try {
        const isAuthorized = await isAuthorised(req);
        // const isAuthorized = true;
        if (isAuthorized) {
            const { email } = req.body;
            console.log(email)
            if (!email) {
                return res.status(400).json(new apiResponse(400, "Necessary credentials missing", {}));
            }

            const userPresent = await profileModel.findOne({ email });
            if (userPresent) {
                const userDeleted = await profileModel.deleteOne({ email });
                if (userDeleted.deletedCount > 0) {
                    const { name } = userPresent
                    const { jwtToken } = req.cookies
                    // const sendMailPromise = await transporter.sendMail({
                    //     to: email,
                    //     subject: `Account Deleted in satellite control`,
                    //     text: `Hello ${name}\nWe have deleted your account in satellite control with\nEmail:${email}`,
                    // });

                    const sendMailPromise = true



                    if (!sendMailPromise) {
                        return res.status(400).json(new apiResponse(400, "User deleted but mail not sent", {}))
                    }
                    return res.status(200).json(new apiResponse(200, "User details deleted successfully", {}));
                } else {
                    return res.status(400).json(new apiResponse(400, "User deletion failed", {}));
                }
            } else {
                return res.status(400).json(new apiResponse(400, "Cannot delete undefined person", {}));
            }
        } else {
            return res.status(403).json(new apiResponse(403, "User is not authorised to perform this action", {}));
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json(new apiResponse(500, "Internal server error", {}));
    }
}

async function updateUserInfo(req, res) {
    try {

        if (isAuthorised(req)) {
            const { level, name, email } = req.body;

            if (!email) {
                return res.status(400).json(new apiResponse(400, "Email is required", {}));
            }

            const updateFields = {};
            if (level) updateFields.level = level;
            if (name) updateFields.name = name;

            const updatedInfo = await profileModel.findOneAndUpdate(
                { email },
                { $set: updateFields },
                { new: true }
            );

            if (updatedInfo) {
                return res.status(200).json(new apiResponse(200, "User updated successfully", {}));
            } else {
                return res.status(400).json(new apiResponse(400, "User not found or update failed", {}));
            }
        }
        else
            return res.json(new apiResponse(403, "User not authorised", {})).status(403)
    } catch (e) {
        console.log(e);
        return res.status(500).json(new apiResponse(500, "Internal server error", {}));
    }
}


async function refresh(req, res) {
    try {
        const { jwtToken } = req.cookies
        if (!jwtToken) {
            return res.status(403).json(new apiResponse(403, "You are unauthorised to perform this task", {}))
        }
        else {
            const jwtPayload = jwt.verify(jwtToken, process.env.JWT_SECRET_TOKEN);
            const newJwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET_TOKEN, {
                expiresIn: process.env.JWT_TOKEN_EXPIRY_TIME
            });

            if (!jwtPayload || !newJwtToken) {
                return res.status(400).json(new apiResponse(400, "Failed to generate jwt token", {}))
            }
            else {
                res.cookie("jwtToken", newJwtToken, { httpOnly: true })
                return res.status(200).json(new apiResponse(200, "Token refreshed successfully", jwtPayload))
            }
        }
    } catch (e) {
        console.log(e)
        return res.status(500).json(new apiResponse())
    }
}

export { login, addPeople, logout, deleteUser, updateUserInfo, refresh };
