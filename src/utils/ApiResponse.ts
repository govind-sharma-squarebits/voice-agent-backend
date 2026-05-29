export class ApiResponse {
  static success<T>(data: T, message = 'Success', statusCode = 200) {
    return { success: true, statusCode, message, data };
  }

  static error(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    return { success: false, statusCode, code, message };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success',
  ) {
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
