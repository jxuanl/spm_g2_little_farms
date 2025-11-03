// routes.js
import express from "express";
import { 
  verifyUserToken, 
  logoutUser, 
  createUser ,
  deleteUser
} from "../services/authService.js";

const router = express.Router();

/**
 * @route POST /verify
 * @desc Verifies Firebase ID token sent from frontend after successful login
 * @body { token: string }
 */
router.post("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const result = await verifyUserToken(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * @route POST /logout
 * @desc Logs out user (handled on frontend, but endpoint kept for completeness)
 */
router.post("/logout", async (req, res) => {
  try {
    const result = await logoutUser();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await createUser({
      email,
      password,
      name: name || '',
      role: role || 'staff',
      department: department || ''
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.user
    });

  } catch (error) {
    console.error('Error in create user route:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// router.put('updateUser/:uid', async (req, res) => {
//   try {
//     const { uid } = req.params;
//     const updateData = req.body;

//     if (!uid) {
//       return res.status(400).json({
//         success: false,
//         message: 'User UID is required'
//       });
//     }

//     if (!updateData || Object.keys(updateData).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Update data is required'
//       });
//     }

//     const result = await updateUser(uid, updateData);

//     res.status(200).json({
//       success: true,
//       message: 'User updated successfully',
//       data: result.user
//     });

//   } catch (error) {
//     console.error('Error in update user route:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// });



/**
 * Delete user from Firestore and Firebase Auth
 * DELETE /api/users/:uid
 */
router.delete('/deleteUser/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID is required'
      });
    }

    const result = await deleteUser(uid);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error in delete user route:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


export default router;
