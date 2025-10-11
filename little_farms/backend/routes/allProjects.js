import express from 'express';
import { authenticate } from './users.js';
import { db } from '../adminFirebase.js';

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects (protected route)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const projectsRef = db.collection('Projects');
    const snapshot = await projectsRef.get();
    
    const projects = [];
    snapshot.forEach(doc => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/projects/:id
 * Get project by ID (protected route)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const projectDoc = await db.collection('Projects').doc(id).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: projectDoc.id,
        ...projectDoc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/projects
 * Create new project (protected route)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, status = 'active' } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    const projectData = {
      name: name.trim(),
      description: description?.trim() || '',
      status,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('Projects').add(projectData);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        id: docRef.id,
        ...projectData
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;