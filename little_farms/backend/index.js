import 'dotenv/config';
// import Bree from 'bree';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

// Imported Routes
import tasksRouter from './routes/tasks.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/authentication.js'
import projectsRouter from './routes/projects.js'
import updateRouter from './routes/update.js'
import allProjectsRouter from './routes/allProjects.js'
import timelineRouter from "./routes/timeline.js";
import generateReportRouter from './routes/reportExporting.js'
import { startDeadlineChecker } from './services/deadlineService.js';
import { attachWebSocket, whenConnected } from './services/webSocketService.js';
import notificationsRouter from './routes/notifications.js';
import logTimeRouter from './routes/loggedTime.js';

const app = express();

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/update', updateRouter);
app.use('/api/allProjects', allProjectsRouter);
app.use("/api/timeline", timelineRouter);
app.use('/api/report', generateReportRouter);
app.use("/api/update", updateRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/logTime", logTimeRouter);

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
attachWebSocket(server);

server.listen(PORT, async ()=> {
  console.log(`Server started on port 3001`);
  await whenConnected
  // Start the deadline checker after server starts
  // startDeadlineChecker(300_000);
});