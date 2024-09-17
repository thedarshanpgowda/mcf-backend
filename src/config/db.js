import mongoose from "mongoose";

const connectToDatabase = async (url) => {
    try {
        await mongoose.connect(url)
        console.log("Connected to database")
    }
    catch (e) {
        console.log("Unable to connect to database")
        process.exit(1)
    }
}

export default connectToDatabase