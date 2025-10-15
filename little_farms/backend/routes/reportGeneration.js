import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create a unique temp filename
function getTempFileName() {
  return path.join(os.tmpdir(), `task_report_${Date.now()}.pdf`);
}

const router = express.Router();

router.get('/generate-report', (req, res) => {
  const tempFile = getTempFileName();
  
  const pythonScriptPath = path.join(__dirname, '../services/reportGenerationService.py');
  
  console.log('Generating task report...');
  console.log('Python script path:', pythonScriptPath);
  console.log('Output file:', tempFile);

  // Check if Python script exists
  if (!fs.existsSync(pythonScriptPath)) {
    console.error('Python script not found at:', pythonScriptPath);
    return res.status(500).json({ 
      error: 'PDF generation service not available',
      details: `File not found: ${pythonScriptPath}`
    });
  }

  const pythonProcess = spawn('python', [pythonScriptPath, tempFile]);

  // Capture Python script output and errors
  let pythonOutput = '';
  let pythonError = '';

  pythonProcess.stdout.on('data', (data) => {
    pythonOutput += data.toString();
    console.log('Python output:', data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
    console.error('Python error:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log('Python process exited with code:', code);
    
    if (code === 0 && fs.existsSync(tempFile)) {
      const stats = fs.statSync(tempFile);
      console.log('Generated PDF file size:', stats.size, 'bytes');
      
      // Set headers to open in browser instead of download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="task_report.pdf"');
      res.setHeader('Content-Length', stats.size);
      
      // Stream the file
      const fileStream = fs.createReadStream(tempFile);
      fileStream.pipe(res);
      
      // Clean up after streaming
      fileStream.on('end', () => {
        fs.unlink(tempFile, (err) => {
          if (err) console.error('Error deleting temp file:', err);
          else console.log('Temp file cleaned up:', tempFile);
        });
      });
      
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        fs.unlink(tempFile, () => {});
        res.status(500).json({ error: 'Failed to stream PDF file' });
      });
      
    } else {
      console.error('PDF generation failed. Exit code:', code);
      console.error('File exists:', fs.existsSync(tempFile));
      console.error('Python error output:', pythonError);
      
      res.status(500).json({ 
        error: 'Failed to generate task report',
        details: pythonError || 'Unknown error during PDF generation'
      });
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
    res.status(500).json({ 
      error: 'Failed to start PDF generation',
      details: err.message
    });
  });
});

// Alternative endpoint if you want to keep both options
router.get('/download-task-report', (req, res) => {
  const tempFile = getTempFileName();
  const pythonScriptPath = path.join(__dirname, '../services/reportGenerationService.py');

  const pythonProcess = spawn('python', [pythonScriptPath, tempFile]);

  pythonProcess.on('close', (code) => {
    if (code === 0 && fs.existsSync(tempFile)) {
      // This will force download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="task_report.pdf"');
      
      const fileStream = fs.createReadStream(tempFile);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        fs.unlink(tempFile, () => {});
      });
    } else {
      res.status(500).send('Failed to generate PDF');
    }
  });
});

export default router;