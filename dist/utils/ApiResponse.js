export class ApiResponse {
    static success(data, message = 'Success', statusCode = 200) {
        return { success: true, statusCode, message, data };
    }
    static error(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        return { success: false, statusCode, code, message };
    }
    static paginated(data, total, page, limit, message = 'Success') {
        return {
            success: true,
            statusCode: 200,
            message,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
