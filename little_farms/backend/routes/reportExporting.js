import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createCSV } from '../services/csvReportService.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create a unique temp filename
function getTempFileName(reportType = 'report') {
  return path.join(os.tmpdir(), `${reportType}_${Date.now()}.pdf`);
}

const router = express.Router();

// POST endpoint to generate report with dynamic data
router.post('/generate_pdf', (req, res) => {
  const {
    data,
    reportType = 'task-completion',
    filterType = 'undefined',
    reportTitle = 'Report',
    timeFrame = 'Undefined'
  } = req.body;


  // console.log('=== INCOMING REQUEST DATA ===');
  // console.log('Full req.body:', JSON.stringify(req.body, null, 2));
  // console.log('Report type:', reportType);
  // console.log('Filter type:', filterType);
  // console.log('Report title:', reportTitle);
  // console.log('Time frame:', timeFrame);
  // console.log('Data Count:', data ? data.length : 0);

  // Validate based on report type
  if (reportType === 'task-completion' && (!data || !Array.isArray(data))) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: 'Tasks array is required for task completion reports'
    });
  }

  if (reportType === 'team-summary' && (!data || !Array.isArray(data))) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: 'Projects array is required for project summary reports'
    });
  }

  const tempFile = getTempFileName(reportType);
  const pythonScriptPath = path.join(__dirname, '../services/pdfReportService.py');

  // console.log('Generating', reportType, 'report with data...');
  // console.log('Python script path:', pythonScriptPath);
  // console.log('Output file:', tempFile);
  // console.log('Time frame:', timeFrame);

  // Check if Python script exists
  if (!fs.existsSync(pythonScriptPath)) {
    console.error('Python script not found at:', pythonScriptPath);
    return res.status(500).json({
      error: 'PDF generation service not available',
      details: `File not found: ${pythonScriptPath}`
    });
  }

  // Prepare configuration data for Python script
  const configData = JSON.stringify({
    report_type: reportType,
    filter_type: filterType,
    report_title: reportTitle,
    timeFrame: timeFrame,
    filename: tempFile,
    // tasks: tasks || [],
    // projects: projects || [],
    data: data || []
  });

  const pythonProcess = spawn('python', [pythonScriptPath]);

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

  // Send data to Python process via stdin
  pythonProcess.stdin.write(configData);
  pythonProcess.stdin.end();

  pythonProcess.on('close', (code) => {
    console.log('Python process exited with code:', code);

    if (code === 0 && fs.existsSync(tempFile)) {
      const stats = fs.statSync(tempFile);
      // console.log('Generated PDF file size:', stats.size, 'bytes');

      // Set headers to open in browser instead of download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${reportType}_report.pdf"`);
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
        fs.unlink(tempFile, () => { });
        res.status(500).json({ error: 'Failed to stream PDF file' });
      });

    } else {
      console.error('PDF generation failed. Exit code:', code);
      console.error('File exists:', fs.existsSync(tempFile));
      console.error('Python error output:', pythonError);

      res.status(500).json({
        error: 'Failed to generate report',
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

// GET endpoint for backward compatibility (uses default report type)
router.get('/generate_pdf', (req, res) => {
  const reportType = req.query.report_type || 'task-completion';
  const tempFile = getTempFileName(reportType);
  const pythonScriptPath = path.join(__dirname, '../services/pdfReportService.py');

  // For GET requests, pass minimal data
  const configData = JSON.stringify({
    report_type: reportType,
    filename: tempFile,
    report_title: 'Report',
    timeFrame: 'Undefined',
    // tasks: [],
    // projects: [],
    data: []
  });

  const pythonProcess = spawn('python', [pythonScriptPath]);

  let pythonError = '';

  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
    console.error('Python error:', data.toString());
  });

  pythonProcess.stdin.write(configData);
  pythonProcess.stdin.end();

  pythonProcess.on('close', (code) => {
    if (code === 0 && fs.existsSync(tempFile)) {
      const stats = fs.statSync(tempFile);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${reportType}_report.pdf"`);
      res.setHeader('Content-Length', stats.size);

      const fileStream = fs.createReadStream(tempFile);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        fs.unlink(tempFile, () => { });
      });
    } else {
      res.status(500).json({
        error: 'Failed to generate report',
        details: pythonError
      });
    }
  });
});

router.post('/generate_csv', (req, res) => {
  try {
    const { data, reportType = 'task-completion' } = req.body;
    
    // console.log('=== CSV GENERATION REQUEST ===');
    // console.log('Report type:', reportType);
    // console.log('Data received:', data);

    // Validate the request
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: 'Data array is required for CSV export'
      });
    }

    // Check if data is empty
    if (data.length === 0) {
      return res.status(400).json({
        error: 'No data to export',
        details: 'The report contains no data to generate CSV'
      });
    }

    // console.log('Generating CSV with fields:', Object.keys(data[0]));
    
    const csv = createCSV(data);
    
    // Generate appropriate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${reportType}_report_${timestamp}.csv`;
    
    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    res.send(csv);

  } catch (err) {
    console.error('CSV generation error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to generate CSV',
      details: err.message 
    });
  }
});

export default router;