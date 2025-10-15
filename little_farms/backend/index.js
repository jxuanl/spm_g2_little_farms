import 'dotenv/config';
// import Bree from 'bree';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

// Imported Routes
import tasksRouter from './routes/tasks.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/authentication.js'
import projectsRouter from './routes/projects.js'
import updateRouter from './routes/update.js'
import allProjectsRouter from './routes/allProjects.js'
import timelineRouter from "./routes/timeline.js";

const app = express()

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

app.use(express.json())

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use('/api/tasks', tasksRouter)
app.use('/api', usersRouter)
app.use('/api/auth', authRouter)
app.use('/api/projects', projectsRouter);
app.use('/api/update', updateRouter);
app.use('/api/allProjects', allProjectsRouter);
app.use("/api/timeline", timelineRouter);

// const bree = new Bree({
//   jobs: [
//     {
//       name: 'check-user-deadlines',
//       path: path.join(__dirname, 'jobs/check-deadline.js'),
//       interval: '1m'
//     }
//   ]
// });

// bree.start().catch(err => {
//   console.error('Bree failed to start:', err);
//   process.exit(1);
// });

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))