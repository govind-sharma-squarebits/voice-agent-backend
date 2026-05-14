export class ApiResponse<T = any> {
  public success: boolean;
  
  constructor(
    public statusCode: number,
    public data: T,
    public message: string = "Success"
  ) {
    this.success = statusCode < 400;
  }

  static success<T>(data: T, message: string = "Success", statusCode: number = 200) {
    return new ApiResponse(statusCode, data, message);
  }

  static error(message: string = "Error", statusCode: number = 500) {
    return new ApiResponse(statusCode, null, message);
  }
}
