# AI Threat Hunter - Backend

This is the backend for the AI Threat Hunter application, built with Django, Django Channels, and Daphne. It provides a real-time API for threat detection and storage.

## Features

- **Real-Time Alerts**: Uses WebSockets to broadcast threats to connected clients instantly.
- **AI Integration**: Analyzes network traffic using a trained Machine Learning model (`threat_model.pkl`).
- **REST API**: Endpoint for ingesting network logs.

## Prerequisites

- Python 3.10+
- Redis Server (Required for Channel Layer)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd core
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install daphne channels channels_redis django-cors-headers djangorestframework joblib numpy scikit-learn
    ```

4.  **Run Migrations**:
    ```bash
    python manage.py migrate
    ```

## Running the Server

1.  **Start Redis**: Ensure your Redis server is running on `127.0.0.1:6379`.
2.  **Start Django/Daphne**:
    ```bash
    python manage.py runserver
    ```
    The server will start at `http://127.0.0.1:8000/`.

## API Endpoints

### HTTP
-   **`POST /api/ingest-log/`**: Submit network log data for analysis.
    -   **Payload**:
        ```json
        {
            "src_ip": "192.168.1.5",
            "packet_size": 512,
            "duration": 10,
            "source_port": 443
        }
        ```
    -   **Response**: `{"status": "Threat Detected & Logged"}` or `{"status": "Traffic Safe"}`.

### WebSockets
-   **`ws://127.0.0.1:8000/ws/alerts/`**: Subscribe to real-time threat alerts.

## AI Model

Place your trained model file `threat_model.pkl` in the `api/` directory. The application will attempt to load this model on startup. If missing, it defaults to a fail-safe mode (no threats detected).
