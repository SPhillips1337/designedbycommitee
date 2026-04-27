# Usage Guide: DesignedByCommittee

This guide explains how to start and interact with the DesignedByCommittee platform.

## Prerequisites
- Node.js (v18+)
- npm or yarn

## Setup

1. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Environment Variables:**
   Copy the example environment file and customize it if necessary:
   ```bash
   cp .env.example .env
   ```

## Running the Application

You will need two terminal windows to run both the frontend and the backend orchestrator.

### 1. Start the Backend Orchestrator
The Node.js server handles the WebSocket connections, real-time sync, and the Manager Agent logic.
```bash
cd server
node index.js
```
*Expected Output: `Server is running on port 4002`*

### 2. Start the Frontend Application
The Vite development server hosts the React application.
```bash
# From the project root
npm run dev
```
*Expected Output: A local server URL (e.g., `http://localhost:5173`)*

## Interacting with the Platform

1. **Open the Dashboard**: Navigate to the Vite local server URL in your browser.
2. **Observe Sync**: The "Live Sync" indicator in the top right will glow green when connected to the Node.js backend.
3. **Vote and Tweak**: Use the sliders and color buttons in the "Live Voting" widget to adjust design tokens. 
4. **Agent Feedback**: When you change tokens, the `ManagerAgent` intercepts these updates. If you attempt an invalid action (e.g., setting the Primary color to the Error token `#FF6E84`), the `designValidator` skill will block it and broadcast a system warning in the Committee Feed.

## Architecture Overview
- **Frontend**: React + Vite using CSS variables mapped to the "Luminous Obsidian" design system.
- **Backend**: Node.js WebSocket server (`server/index.js`).
- **Agent Stack**: Located in `server/agent-stack/`. Features a decoupled `ManagerAgent` and individual `skills` for evaluating design choices.
