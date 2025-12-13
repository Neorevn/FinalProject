from flask import Blueprint, request
from prometheus_client import generate_latest, Counter, Histogram, Gauge, multiprocess
import time
import os

metrics_bp = Blueprint('metrics', __name__)

# Initialize Prometheus metrics
HTTP_REQUESTS_TOTAL = Counter(
    'http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status']
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    'http_request_duration_seconds', 'HTTP Request Duration', ['method', 'endpoint']
)
HTTP_REQUESTS_IN_PROGRESS = Gauge(
    'http_requests_in_progress', 'HTTP Requests In Progress', ['method', 'endpoint']
)

# Configure multiprocess mode for Gunicorn
if 'PROMETHEUS_MULTIPROC_DIR' in os.environ:
    try:
        multiprocess.MultiProcessCollector(os.environ['PROMETHEUS_MULTIPROC_DIR'])
    except ValueError:
        pass # Directory might not exist yet or already configured

@metrics_bp.route('/metrics', methods=['GET'])
def prometheus_metrics():
    """Exposes Prometheus metrics."""
    return generate_latest(), 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}

def before_request_hook():
    request.start_time = time.time()
    HTTP_REQUESTS_IN_PROGRESS.labels(request.method, request.path).inc()

def after_request_hook(response):
    if hasattr(request, 'start_time'):
        request_duration = time.time() - request.start_time
        HTTP_REQUEST_DURATION_SECONDS.labels(request.method, request.path).observe(request_duration)
        HTTP_REQUESTS_TOTAL.labels(request.method, request.path, response.status_code).inc()
    HTTP_REQUESTS_IN_PROGRESS.labels(request.method, request.path).dec()
    return response