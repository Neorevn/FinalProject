import os
import logging
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from pymongo.errors import ConnectionFailure, OperationFailure

uri = os.getenv("MONGO_URI")

if not uri:
    logging.error("FATAL: MONGO_URI environment variable not set.")
    raise ValueError("MONGO_URI environment variable not set. Please create a .env file with this variable.")

# It's a common mistake to include quotes in the .env file. Let's strip them.
uri = uri.strip().strip('"\'')

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    logging.info("Database: Ping successful. You are connected to MongoDB!")
except ConnectionFailure as e:
    logging.error(f"Database: Connection failed. Could not connect to the server. Check your network connection and IP whitelist. Details: {e}")
    raise
except OperationFailure as e:
    logging.error(f"Database: Authentication failed. Check your username and password in the MONGO_URI. Details: {e}")
    raise
    
# Get a handle to the database.
db = client['office_app_db']