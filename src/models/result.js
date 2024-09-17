import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema({
    date: String,
    endDate: String,
    gsat_number: String,
    result: [Object],
    inactivity: [Object],
    thresholdArr: [Object],
    stabilityArr: [Object]
});

const ResultModel = mongoose.model('Result', ResultSchema);
export default ResultModel