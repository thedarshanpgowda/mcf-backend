import mongoose, { Types } from "mongoose";

const historySchema = new mongoose.Schema({
    id: {
        type: String
    },
    userId: {
        type: String
    },
    date: {
        type: Date,
        default: new Date()
    },
    gsat_number: {
        type: String
    },
    searchedDate: {
        type: String,
        default: new Date()
    }
})

const historyModel = mongoose.model('history', historySchema)
export default historyModel