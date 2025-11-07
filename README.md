# Little Farms Task Management System

A comprehensive project management system built with Vue.js frontend and Node.js backend, using Firebase for authentication and data storage.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Features](#features)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project Structure
```
little_farms/
├── frontend/           # Vue.js frontend application
│   └── src/
│       ├── components/ # Vue components
│       └── views/      # Vue views/pages
├── backend/            # Node.js backend server
│   ├── routes/         # API routes
│   └── services/       # Business logic services
└── tests/              # Test cases
    ├── backend/        # Backend tests
    └── e2e/           # End-to-end tests
```

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (v6.0.0 or higher)
- **Firebase CLI** (for deployment)
- **Python** (v3.6 or higher)
- **pip** (Python package manager)

### Python Dependencies

The system uses Python's **json2csv** package for CSV report generation. Install it using:
```bash
pip install json2csv
```

## Getting Started

### 1. Installation

Clone the repository and install dependencies:
```bash
# Clone the repository
git clone https://github.com/jxuanl/spm_g2_little_farms.git
cd spm_g2_little_farms

# Install backend dependencies
cd little_farms/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Firebase Configuration

1. Create a project in the [Firebase Console](https://console.firebase.google.com)
2. Generate a service account key:
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
3. Download `serviceAccountKey.json` and place it in `little_farms/backend/`

### 3. Environment Setup

Create a `.env` file in the `little_farms/frontend/` directory with the following variables:
```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Running the Application

### Backend Server
```bash
cd little_farms/backend
npm start
```

The backend server will start on **http://localhost:3000**

### Frontend Application
```bash
cd little_farms/frontend
npm run dev
```

The frontend will be available at **http://localhost:5173**

## Testing

### Backend Tests
```bash
cd tests
npm test
```

**Note for Windows users:** Update the test script in `tests/package.json`:
```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles --forceExit --runInBand"
  }
}
```

### End-to-End Tests

Detailed instructions can be found in the [tests README](tests/README.md).
```bash
# From the repo root, navigate to the tests directory
cd tests

# Install dependencies
npm ci

# Install Playwright browsers with system dependencies
npx playwright install --with-deps
```

**Before running E2E tests:**
1. Ensure both frontend and backend servers are running
2. Create `tests/e2e/.env` with test credentials:
```bash
   TEST_STAFF_EMAIL=your_test_email
   TEST_STAFF_PASSWORD=your_test_password
```

**Run E2E tests:**
```bash
# Run in headed mode (visible browser)
npx playwright test --headed

# Run in headless mode
npx playwright test
```

## Features

- User Authentication & Authorization
- Project Management
- Task Management & Tracking
- Timeline View
- Real-time Notifications
- Report Generation (CSV & PDF)
- Comments & Collaboration Tools
- Real-time Updates via WebSocket

## Development Guidelines

1. Add new screens to the `src/views/` folder
2. Update the router in `router.js` for new routes
3. Follow existing code structure and naming conventions
4. Write tests for all new features
5. Ensure code passes linting before committing

## Troubleshooting

If you encounter issues:

1. **Dependencies**: Ensure all dependencies are properly installed
```bash
   npm install
```

2. **Firebase**: Verify your Firebase configuration and `serviceAccountKey.json`

3. **Environment Variables**: Check that all required variables are set in `.env`

4. **Cache Issues**: Clear npm cache if needed
```bash
   npm cache clean --force
```

5. **Port Conflicts**: Ensure ports 3000 (backend) and 5173 (frontend) are available


## License

This project is licensed under the MIT License.

---

**Need Help?** Open an issue on GitHub or contact the maintainers.

Link to github repo: https://github.com/jxuanl/spm_g2_little_farms
