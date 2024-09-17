import { config } from "dotenv";
import app from "./app.js";
import connectToDatabase from "./config/db.js";
import process from "node:process"
import cluster from "node:cluster";
import { availableParallelism } from "node:os";

config()

connectToDatabase(process.env.MONGODB_CONNECTION_STRING)
    .then(() => {
        const noOfCpus = availableParallelism()

        if (cluster.isPrimary) {
            console.log("Primary process has started ", process.pid)

            cluster.on("exit", (worker) => {
                console.log("Worker process started ", worker.process.pid)
                cluster.fork()
            })

            for (var i = 0; i < noOfCpus; i++) {
                cluster.fork()
            }
        } else {
            app.listen(process.env.PORT, () => {
                console.log("Server              started")
            })
        }

    })
    .catch(e => {
        console.log("Unable to connect to the database")
        console.log(e)
    })