import pytest
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app

@pytest.fixture
def client():
    # Mock environment variables needed for app startup
    os.environ['MONGO_URI'] = 'mongodb://mock:27017/db'
    os.environ['SECRET_KEY'] = 'test_secret'
    
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200