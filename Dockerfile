# --- Stage 1: Build the backend application ---
FROM python:3.11-slim as backend-builder

# Set environment variables
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if any (e.g., for psycopg2)
# Uncomment and adjust if your Flask app uses psycopg2 directly or other C extensions
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose port 5000 for the Flask app
EXPOSE 5000

# Use a non-root user for security
RUN adduser --system --no-create-home appuser
USER appuser

# Health check for Kubernetes readiness/liveness probes
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:5000/health || exit 1

# Run the application using Gunicorn
# The wsgi.py file will be the entry point for Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "60", "wsgi:app"]