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

# Access the 'Woice' database and the 'chunks' collection
db = client['woice']
collection = db['images_and_videos']



def insert_image(all_chunks, indices, embeddings, kbId, s3_key):
    # Prepare documents for insertion
    image_explanation = [{
        "type": "image",
        "image_s3_key": s3_key,
        "datetime": datetime.datetime.now(),
        "kbId": kbId,
        "metadata": {"chunkNo": indices[i]['chunk_no']},
        "content": all_chunks[i],
        "bgeVectors": embeddings[i]
    } for i in range(len(all_chunks))]

    # Insert documents into the collection
    collection.insert_many(image_explanation)

def insert_video_without_transcription(video_scene_description,embeddings2, kbId, s3_key):
    # Prepare documents for insertion
    image_explanation = [{
        "type": "video",
        "image_s3_key": s3_key,
        "datetime": datetime.datetime.now(),
        "kbId": kbId,
        "video_scene_description":video_scene_description[i],
        "bgeVectors":embeddings2[i]
    } for i in range(len(video_scene_description))]
    collection.insert_many(image_explanation)

def insert_video_with_transcription(video_scene_description, embeddings2, kbId, s3_key, video_transcription,
                                           embeddings1):
        # Prepare documents for insertion
    image_explanation = [{
        "type": "video",
        "image_s3_key": s3_key,
        "datetime": datetime.datetime.now(),
        "kbId": kbId,
        "video_transcription": video_transcription[i] if i < len(video_transcription) else None,
        "bgeVectors2": embeddings1[i] if embeddings1 and i < len(embeddings1) else None,
        "video_scene_description": video_scene_description[i] if i < len(video_scene_description) else None,
        "bgeVectors": embeddings2[i] if embeddings2 and i < len(embeddings2) else None
    } for i in range(max(len(video_transcription), len(video_scene_description)))]

    # Insert documents into the collection
    collection.insert_many(image_explanation)

