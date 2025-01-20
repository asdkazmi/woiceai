import logging
import os
import time

import runpod
from dotenv import load_dotenv

from modules import chunks
from modules.credits import cost
from modules.custom_mongodb_handling import custom_mongodb_processing, check_unique_id
from modules.embeddings import runpod_api_pipeline
from modules.mongo import db, insert_image, insert_video
from modules.process_image import process_image
from modules.process_video import download_video_from_url
from modules.process_video import process_video
from modules.s3download import download_file_from_s3
from modules.sns import sending_message_attributes_to_sns
from modules.transcribing_video import transcribe_video

load_dotenv()

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event):
    handler_start = time.time()
    # Code for input data
    payload = event['input']
    url = payload.get('url')
    s3_key = payload.get('s3_key')
    content_type = payload['content_type']
    kbId = payload['kbId']
    delay = payload.get('delay', 10)
    title = payload.get('title')
    mongodb_srv = payload.get('mongodb_srv', None)
    unique_id = payload.get('unique_id', None)

    if content_type == 'video':
        try:
            if url:
                logging.info("Received event for video with url")
                video_path = download_video_from_url(url)
            elif s3_key:
                logging.info("Received event for video with s3_key")
                video_path = download_file_from_s3(s3_key)
            if video_path is None:
                return {
                    "error": "Failed to download video from url."
                }
            logging.info('Processing video...')
            processed_screens = process_video(video_path, delay=delay)
            logger.info('Transcribing video')
            transcription = transcribe_video(video_path)
            os.remove(video_path)
            if transcription:
                logger.info("Converting video transcription to chunks")
                audio_chunks = chunks.split_text_into_chunks(content=transcription)
                transcription_chunks = audio_chunks.get("chunks")
                prefix = (f"File Type: Video; Video Name: {title}. Keywords: Video transcription, Talk, Discussion, "
                          f"Said in this video,Spoken content,Conversation,Speech,Dialogue,audio content is: ")
                updated_transcription_chunks = [prefix + item for item in transcription_chunks]

                if mongodb_srv:
                    execution_time_embeddings1 = custom_mongodb_processing(content_chunks=transcription_chunks,
                                                                           mongodb_srv=mongodb_srv, kbId=kbId,
                                                                           s3key=s3_key, title=title,
                                                                           unique_id=unique_id,
                                                                           content_type=content_type, prefix=prefix
                                                                           )
                    # unique_id_int = int(unique_id) + 1
                    unique_id = unique_id + "+1"
                else:
                    logger.info("Creating embeddings for transcription chunks")
                    embeddings1, execution_time_embeddings1 = runpod_api_pipeline(
                        substrings=updated_transcription_chunks,
                        query='',
                        top_k=5,
                        threshold=100,
                        task='embeddings', embedings=True)
                    logger.info("Uploading to DB")
                    insert_video(transcription_chunks, embeddings1, kbId, s3_key, title)
            else:
                execution_time_embeddings1 = 0
                logger.info("Video has no transcription")

            logger.info("Converting video explanation to chunks")
            chunks_for_embedding = []
            video_description_chunks = []
            for i in processed_screens:
                all_chunks = chunks.split_text_into_chunks(content=i["text"])
                description_chunks = all_chunks.get("chunks")
                video_description_chunks.extend(description_chunks)
                for c in description_chunks:
                    meta_data = (f"File Type: Video; Video Name: {title}. Keywords: Scene, Video description, Screen, "
                                 f"Visual, Footage, Image, Shot, Clip, Frame, Sequence, Background of the video is at "
                                 f"the Time: {i['time']}")
                    join_chunk_md = meta_data + '\n' + c
                    chunks_for_embedding.append(join_chunk_md)

            if mongodb_srv:
                execution_time_embeddings2 = custom_mongodb_processing(content_chunks=processed_screens,
                                                                       mongodb_srv=mongodb_srv, title=title,
                                                                       s3key=s3_key, kbId=kbId, unique_id=unique_id,
                                                                       content_type=content_type,
                                                                       case="video_description")
                handler_end = time.time()
                handler_duration = handler_end - handler_start
                credits_consumed = cost(handler_duration, (execution_time_embeddings1 + execution_time_embeddings2))
                message_attributes = {
                    "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                    "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                              "StringValue": s3_key if s3_key else url},
                    "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                    "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
                    "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
                }

                sending_message_attributes_to_sns(message_attributes)
                return message_attributes

            logger.info("Creating embeddings for video explanation chunks")
            embeddings2, execution_time_embeddings2 = runpod_api_pipeline(substrings=chunks_for_embedding, query='',
                                                                          top_k=5,
                                                                          threshold=100,
                                                                          task='embeddings', embedings=True)

            logger.info("Uploading to DB")
            insert_video(all_chunks=video_description_chunks, embeddings=embeddings2, kbId=kbId, s3_key=s3_key,
                         title=title)
            handler_end = time.time()
            handler_duration = handler_end - handler_start
            execution_time_embeddings = execution_time_embeddings1 + execution_time_embeddings2
            credits_consumed = cost(handler_duration, execution_time_embeddings)
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                          "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
            }
            sending_message_attributes_to_sns(message_attributes)
            return message_attributes

        except Exception as e:
            logger.error(f"Error processing video file: {e}")
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String", "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Failed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": "0"}
            }
            sending_message_attributes_to_sns(message_attributes)
            return message_attributes

    elif content_type == 'image':
        try:
            logging.info('Processing image...')
            text = process_image(url, s3_key)

            logger.info("Image is processed successfully")

            logger.info("Converting image explanation to chunks")
            all_data = chunks.split_text_into_chunks(content=text)
            image_chunks = all_data.get("chunks")
            prefix = f"File Type: Image; Image Name: {title}: "
            updated_image_chunks = [prefix + item for item in image_chunks]

            if mongodb_srv:
                execution_time_embeddings = custom_mongodb_processing(content_chunks=image_chunks,
                                                                      mongodb_srv=mongodb_srv,
                                                                      prefix=prefix, s3key=s3_key, kbId=kbId,
                                                                      content_type=content_type, title=title,
                                                                      unique_id=unique_id
                                                                      )
                handler_end = time.time()
                handler_duration = handler_end - handler_start
                credits_consumed = cost(handler_duration, execution_time_embeddings)
                message_attributes = {
                    "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                    "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                              "StringValue": s3_key if s3_key else url},
                    "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                    "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
                    "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
                }

                sending_message_attributes_to_sns(message_attributes)
                return message_attributes

            logger.info("Creating embeddings for chunks")
            embeddings, execution_time_embeddings = runpod_api_pipeline(substrings=updated_image_chunks, query='',
                                                                        top_k=5,
                                                                        threshold=100,
                                                                        task='embeddings', embedings=True)

            logger.info("Uploading to DB")
            insert_image(all_data.get("chunks"), all_data.get("indices"), embeddings, kbId, s3_key, title)
            handler_end = time.time()
            handler_duration = handler_end - handler_start
            credits_consumed = cost(handler_duration, execution_time_embeddings)
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                          "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
            }
            sending_message_attributes_to_sns(message_attributes)
            return message_attributes

        except Exception as e:
            logger.error(f"Error processing image file: {e}")
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String", "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": content_type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Failed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": "0"}
            }
            sending_message_attributes_to_sns(message_attributes)
            return message_attributes


runpod.serverless.start({
    "handler": handler
})
