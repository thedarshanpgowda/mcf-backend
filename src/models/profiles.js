import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    level: {
        type: Number,
        default: 1
    },
    userId: {
        type: String,
        unique: true
    }
})

const profileModel = mongoose.model("Profiles", profileSchema)
export { profileModel }