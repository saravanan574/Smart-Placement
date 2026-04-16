const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const { sendError } = require('../utils/responseHelper')

const protect = async (req, res, next) => {
  try {
    let token

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return sendError(res, 'Not authorized, no token provided', 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return sendError(res, 'Not authorized, user not found', 401)
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Not authorized, invalid token', 401)
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Not authorized, token expired', 401)
    }
    return sendError(res, 'Not authorized', 401)
  }
}

module.exports = protect 