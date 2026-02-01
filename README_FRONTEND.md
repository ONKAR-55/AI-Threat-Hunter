# AI Threat Hunter - Frontend (SOC Dashboard)

This is the frontend for the AI Threat Hunter, built with Next.js 15, Tailwind CSS, and Lucide React.

## Features

- **Login Page**: JWT-based authentication (`/login`).
- **Real-Time Dashboard**: Visualizes threats using WebSockets (`/dashboard`).
- **Responsive UI**: Built with Tailwind CSS.

## Prerequisites

- Node.js 18+
- Backend running on `http://127.0.0.1:8000`

## Installation

1.  **Navigate to the folder**:
    ```bash
    cd soc-dashboard
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # Ensure lucide-react is installed
    npm install lucide-react
    ```

## Running the Application

1.  **Start the development server**:
    ```bash
    npm run dev
    ```
2.  **Access the App**:
    -   Open via `http://localhost:3000`.
    -   Login at `http://localhost:3000/login`.
    -   View Dashboard at `http://localhost:3000/dashboard`.

## Usage

1.  Go to `/login`.
2.  Enter your backend credentials (e.g., `admin` / `password`).
3.  Upon success, you are redirected to `/dashboard`.
4.  The dashboard connects to the Backend WebSocket and listens for alerts.
