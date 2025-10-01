import 'dotenv/config';
// import Bree from 'bree';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import tasksRouter from './routes/tasks.js'
import usersRouter from './routes/users.js'

const app = express()
app.use(express.json())

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use('/api/tasks', tasksRouter)
app.use('/api/users', usersRouter)
// app.use('/api/deadlines', deadlinesRouter)

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