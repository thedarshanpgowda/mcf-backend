
class apiResponse {
    constructor( status = 500, message = "Internal server Errro", data = {} ) {
        this.statusCode = status,
            this.message = message,
            this.data = data,
            this.status = status < 400
    }
}

export { apiResponse }