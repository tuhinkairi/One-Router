# OneRouter Backend

FastAPI-based backend for OneRouter application.

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

2. **Activate virtual environment:**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

5. **Run the server:**
   ```bash
   python main.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/example` - Example data endpoint

## Frontend Integration

The backend is configured with CORS to accept requests from:
- `http://localhost:3000` (Next.js development)
- `http://localhost:8000`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:8000`

Update the `allowed_origins` in `main.py` for production deployments.

## Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
