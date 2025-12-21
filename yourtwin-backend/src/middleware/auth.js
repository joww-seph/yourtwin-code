import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token, access denied' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found, token invalid' 
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'User account is deactivated' 
      });
    }
    
    // Attach user to request
    req.user = user;
    console.log(`✅ [Auth] User authenticated: ${user.email} (Role: ${user.role}, ID: ${user._id})`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired, please login again' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Authorize specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log(`🔐 [Authorization Check] User: ${req.user.email}, Role: ${req.user.role}, Required Roles: ${roles.join(', ')}`);
    if (!roles.includes(req.user.role)) {
      console.log(`❌ [Authorization Failed] User role '${req.user.role}' not in allowed roles: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    console.log(`✅ [Authorization Success] User ${req.user.email} authorized`);
    next();
  };
};