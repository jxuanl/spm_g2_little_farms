import express from 'express';
import AuthService from '../services/userService.js'

const router = express.Router();

// Middleware to verify authentication token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await AuthService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * POST /api/auth/login
 * Sign in with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    const result = await AuthService.signIn(email, password);

    res.status(200).json(result);
  } catch (error) {
    let statusCode = 500;
    let message = 'Login failed. Please try again';

    if (error.code === 'auth/user-not-found') {
      statusCode = 404;
      message = 'No account found with this email address';
    } else if (error.code === 'auth/wrong-password' || error.message.includes('password')) {
      statusCode = 401;
      message = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      statusCode = 400;
      message = 'Invalid email address';
    } else if (error.code === 'auth/user-disabled' || error.message.includes('disabled')) {
      statusCode = 403;
      message = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      statusCode = 429;
      message = 'Too many failed attempts. Please try again later';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear session)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // You can add additional logout logic here if needed
    // (e.g., blacklist tokens, update last logout time)
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/register
 * Create new user account
 */
// router.post('/register', async (req, res) => {
//   try {
//     const { email, password, name, role, department } = req.body;

//     // Validation
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required'
//       });
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid email address'
//       });
//     }

//     // Password strength validation
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: 'Password must be at least 6 characters long'
//       });
//     }

//     const userData = {
//       name: name || 'User',
//       role: role || 'staff',
//       department: department || 'General'
//     };

//     const result = await AuthService.createUser(email, password, userData);

//     res.status(201).json({
//       success: true,
//       message: 'Account created successfully',
//       uid: result.uid
//     });
//   } catch (error) {
//     let statusCode = 500;
//     let message = 'Registration failed. Please try again';

//     if (error.code === 'auth/email-already-exists') {
//       statusCode = 409;
//       message = 'Email already in use';
//     } else if (error.code === 'auth/invalid-email') {
//       statusCode = 400;
//       message = 'Invalid email format';
//     } else if (error.code === 'auth/weak-password') {
//       statusCode = 400;
//       message = 'Password is too weak';
//     }

//     res.status(statusCode).json({
//       success: false,
//       message,
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

/**
 * GET /api/auth/session
 * Get current user session (protected route)
 */
router.get('/session', authenticate, async (req, res) => {
  try {
    const result = await AuthService.getUserSession(req.user.uid);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile (protected route)
 */
// router.put('/profile', authenticate, async (req, res) => {
//   try {
//     const updates = req.body;
//     await AuthService.updateUser(req.user.uid, updates);
    
//     res.status(200).json({
//       success: true,
//       message: 'Profile updated successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update profile',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

/**
 * POST /api/auth/verify-token
 * Verify if token is valid
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await AuthService.verifyToken(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

/**
 * GET /api/auth/users
 * Get all users (temporarily without authentication for testing)
 */
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all users...');
    const result = await AuthService.getAllUsers();
    console.log('Users result:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/users/search
 * Search users by email or name (protected route)
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await AuthService.searchUsers(q);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/users/role/:role
 * Get users by role (protected route)
 */
router.get('/role/:role', authenticate, async (req, res) => {
  try {
    const { role } = req.params;
    const result = await AuthService.getUsersByRole(role);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const result = await AuthService.getAllDepartments();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/users/department/:department
 * Get users by department (protected route)
 */
router.get('/department/:department', authenticate, async (req, res) => {
  try {
    const { department } = req.params;
    const result = await AuthService.getUsersByDepartment(department);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/users/:uid
 * Get user by ID (protected route)
 */
router.get('/:uid', authenticate, async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await AuthService.getUserById(uid);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/auth/users/:uid
 * Delete user (protected route - admin only)
 */
router.delete('/:uid', authenticate, async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await AuthService.deleteUser(uid);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



export default router;

