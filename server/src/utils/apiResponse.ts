// Simple API response utilities
export const successResponse = <T>(data: T, message = 'Success') => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (message = 'Error', statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode,
  };
};

export default { successResponse, errorResponse };
