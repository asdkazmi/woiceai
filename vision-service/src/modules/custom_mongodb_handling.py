import datetime
import logging

from dotenv import load_dotenv
from pymongo import MongoClient

from .chunks import split_text_into_chunks
from .embeddings import runpod_api_pipeline
from .mongo import collection as default_collection

load_dotenv()

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def connect_custom_mongodb(mongodb_srv):
    uri = mongodb_srv
    custom_client = MongoClient(uri)

    # Send a ping to confirm a successful connection
    try:
        custom_client.admin.command('ping')
        logger.info("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        logger.info(e)
    custom_db = custom_client['woice-ai-kb']
    custom_collection = custom_db['document-kb']

    return custom_collection


def custom_mongodb_processing(mongodb_srv, content_chunks, kbId, title, unique_id, content_type=None, prefix=None, s3key=None,
                              case=None):
    custom_collection = connect_custom_mongodb(mongodb_srv)
    content_dict = {}

    if case == "video_description":
        video_description_chunks = []
        for i in content_chunks:
            all_chunks = split_text_into_chunks(content=i["text"])
            description_chunks = all_chunks.get("chunks")
            video_description_chunks.extend(description_chunks)

        insert_content(all_chunks=video_description_chunks, kbId=kbId, custom_collection=custom_collection, unique_id=unique_id)

        content_chunks = []
        for doc in custom_collection.find({"unique_id": unique_id}, {"content": 1}):
            if 'content' in doc:
                content_chunk = doc['content']
                meta_data = (f"File Type: Video; Video Name: {title}. Keywords: Scene, Video description, Screen, "
                             f"Visual, Footage, Image, Shot, Clip, Frame, Sequence, Background of the video.")

                combined_chunk = meta_data + '\n' + content_chunk
                content_chunks.append(combined_chunk)

                content_dict[doc['_id']] = combined_chunk
    else:
        insert_content(all_chunks=content_chunks, kbId=kbId, custom_collection=custom_collection, unique_id=unique_id)
        for doc in custom_collection.find({"unique_id": unique_id}, {"content": 1}):
            if 'content' in doc:
                content_dict[doc['_id']] = prefix + doc['content']

        content_chunks = list(content_dict.values())  # Extract all content as a list

    # Generate embeddings for all combined content
    # content_chunks = list(content_dict.values())  # Extract all content as a list
    embeddings, execution_time_embeddings = runpod_api_pipeline(
        substrings=content_chunks,
        query='',
        top_k=5,
        threshold=30,
        task='embeddings',
        embedings=True
    )

    # Construct a dictionary with _id as key and embeddings as value
    embedding_dict = {key: embeddings[i] for i, key in enumerate(content_dict.keys())}

    insert_content(embedding_dict=embedding_dict, kbId=kbId, s3_key=s3key,
                   content_type=content_type, title=title, default_db=True)

    return execution_time_embeddings


def insert_content(all_chunks=None, embedding_dict=None, kbId=None, s3_key=None, content_type=None,
                   title=None, default_db=False, custom_collection=None, unique_id=None):
    if default_db:
        documents_default_db = []

        for i, obj_id in enumerate(embedding_dict.keys()):
            document = {
                "datetime": datetime.datetime.now(),
                "type": content_type,
                "title": title,
                "s3_Key": s3_key,
                "kbId": kbId,
                "reference_to_user_db": obj_id,
                "metadata": {"chunkNo": i + 1},
                "bgeVectors": embedding_dict[obj_id]
            }
            documents_default_db.append(document)

        # Insert documents into the collection
        if documents_default_db:
            try:
                default_collection.insert_many(documents_default_db)
                logger.info("Documents inserted successfully.")
            except Exception as e:
                logger.error(f"Error inserting documents: {e}")

    else:
        existing_document = custom_collection.find_one({"unique_id": unique_id})
        if existing_document:
            raise ValueError(f"Document with unique_id '{unique_id}' already exists.")
        documents_custom_db = [{
            "datetime": datetime.datetime.now(),
            "kbId": kbId,
            "unique_id": unique_id,
            "content": all_chunks[i]
        } for i in range(len(all_chunks))]

        custom_collection.insert_many(documents_custom_db)
