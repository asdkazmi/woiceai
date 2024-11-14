from pymongo import MongoClient
import datetime
from dotenv import load_dotenv
import os
import logging

logger = logging.getLogger(__name__)
load_dotenv()

uri = os.getenv('DB_URI')
# Create a new client and connect to the server
client = MongoClient(uri)

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    logger.info("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    logger.info(e)

# Access the 'woice-ai-kb' database and the 'document-kb' collection
db = client['woice-ai-kb']
collection = db['document-kb']


def insert_image(all_chunks, indices, embeddings, kbId, s3_key):
    # Prepare documents for insertion
    image_explanation = [{
        "type": "image",
        "s3_Key": s3_key,
        "datetime": datetime.datetime.now(),
        "kbId": kbId,
        "metadata": {"chunkNo": indices[i]['chunk_no']},
        "content": all_chunks[i],
        "bgeVectors": embeddings[i]
    } for i in range(len(all_chunks))]

    # Insert documents into the collection
    collection.insert_many(image_explanation)

def insert_video(all_chunks,embeddings, kbId, s3_key):
    # Prepare documents for insertion
    video_explanation = [{
        "type": "video",
        "s3_Key": s3_key,
        "datetime": datetime.datetime.now(),
        "kbId": kbId,
        "content":all_chunks[i],
        "bgeVectors":embeddings[i]
    } for i in range(len(all_chunks))]
    collection.insert_many(video_explanation)

