export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  // Success response (200-299)
  static success(data, message = "Operation successful") {
    return new ApiResponse(200, data, message);
  }

  // Created response (201)
  static created(data, message = "Resource created successfully") {
    return new ApiResponse(201, data, message);
  }

  // Paginated response
  static paginated(data, pagination, message = "Data retrieved successfully") {
    return new ApiResponse(200, {
      ...data,
      pagination
    }, message);
  }

  // No content response (204)
  static noContent(message = "No content") {
    return new ApiResponse(204, null, message);
  }
}