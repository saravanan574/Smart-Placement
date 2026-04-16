/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {any} data - Data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    })
  }
  
  /**
   * Send an error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default 400)
   */
  const sendError = (res, message = 'Something went wrong', statusCode = 400) => {
    return res.status(statusCode).json({
      success: false,
      message,
      data: null
    })
  }
  
  module.exports = { sendSuccess, sendError }