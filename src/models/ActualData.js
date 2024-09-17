import mongoose from "mongoose";

const dataSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    dataResult: {
        type: Array,
        default: []
    },
    gsat: {
        type: String
    },
    pid: {
        type: String
    },
    id: {
        type: String,
        unique: true,
        required: true
    }
});

const dataModel = mongoose.model("Profiles", dataSchema);
export { dataModel };
