# Little Farms Task Management System

A comprehensive project management system built with Vue.js frontend and Node.js backend, using Firebase for authentication and data storage.

## Project Structure

```
little_farms/
├── frontend/    # Vue.js frontend application
│   ├── src/    # Source code
│   │   ├── components/  # Vue components
│   │   └── views/      # Vue views/pages
├── backend/     # Node.js backend server
│   ├── routes/  # API routes
│   └── services/# Business logic services
└── tests/      # Test cases
    ├── backend/ # Backend tests
    └── e2e/    # End-to-end tests
```

## Prerequisites

Before running this application, make sure you have the following installed:
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Firebase CLI (for deployment)

## Getting Started

### 1. Installation

First, clone the repository and install dependencies:

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

### 2. Configuration

1. Set up Firebase:
   - Create a project in [Firebase Console](https://console.firebase.google.com)
   - Download `serviceAccountKey.json` and place it in the `backend` folder
   - Update Firebase configuration in `frontend/firebase.js`

2. Environment Setup:
   - Create `.env` file in the backend directory with required variables

### 3. Running the Application

#### Backend Server
```bash
cd little_farms/backend
npm start
```
The backend server will start on http://localhost:3000

#### Frontend Application
```bash
cd little_farms/frontend
npm run dev
```
The frontend will be available at http://localhost:5173

### 4. Testing

Run backend tests:
```bash
cd tests
npm test
```

Run E2E tests:
```bash
cd tests/e2e
npm run test:e2e
```
*Note: For Winidows OS users, in the package.json under test folder, change the script to:

```{
  "scripts": {
    "test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles --forceExit --runInBand"
  }
}
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

1. Add new screens to the `src/views` folder
2. Update the router in `router.js` for new routes
3. Follow the existing code structure and naming conventions
4. Write tests for new features

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are installed
2. Check Firebase configuration
3. Verify environment variables
4. Clear npm cache if needed: `npm cache clean --force`

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License.
