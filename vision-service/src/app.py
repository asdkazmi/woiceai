import os
import runpod
import logging
import time
from modules.process_video import process_video
from modules.process_video import download_video_from_url
from modules.process_image import process_image
from modules.transcribing_video import transcribe_video
from modules.s3download import download_file_from_s3
from dotenv import load_dotenv

from src.modules import chunks
from src.modules.credits import cost
from src.modules.embedings import runpod_api_pipeline
from src.modules.mongo import insert_image, insert_video
from src.modules.sns import sending_message_attributes_to_sns

load_dotenv()

logger = logging.getLogger()
logger.setLevel(logging.INFO)



def handler(event):
    handler_start = time.time()
    #Code for input data
    payload = event['input']
    url = payload.get('url')
    s3_key = payload.get('s3_key')
    type = payload['content_type']
    kbId = payload['kbId']
    delay = payload.get('delay', 10)  #delay in seconds to capture the screens of the video
    if type == 'video':
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
                transcription_chunks=audio_chunks.get("chunks")
                prefix = f"Keywords: Video transcription, Talk, Discussion, Said in this video,Spoken content,Conversation,Speech,Dialogue,audio content is: "
                updated_transcription_chunks = [prefix + item for item in transcription_chunks]
                logger.info("Creating embeddings for transcription chunks")
                embeddings1, execution_time_embeddings1 = runpod_api_pipeline(substrings=updated_transcription_chunks, query='',
                                                                             top_k=5,
                                                                             threshold=100,
                                                                             task='embeddings', embedings=True)
                logger.info("Uploading to DB")
                insert_video(transcription_chunks, embeddings1, kbId, s3_key)
            else:
                logger.info("Video has no transcription")

            logger.info("Converting video explanation to chunks")
            chunks_for_embedding = []
            video_description_chunks = []
            for i in processed_screens:
                all_chunks = chunks.split_text_into_chunks(content=i["text"])
                all_chunks = all_chunks.get("chunks")
                video_description_chunks.extend(all_chunks)
                for c in all_chunks:
                    meta_data = f"Keywords: Scene, Video description, Screen 1,Visual,Footage,Image,Shot,Clip,Frame,Sequence, Background of the video is at the Time: {i['time']}"
                    join_chunk_md = meta_data + '\n' + c
                    chunks_for_embedding.append(join_chunk_md)
            logger.info("Creating embeddings for video explanation chunks")
            embeddings2, execution_time_embeddings2 = runpod_api_pipeline(substrings=chunks_for_embedding, query='',
                                                                         top_k=5,
                                                                         threshold=100,
                                                                         task='embeddings', embedings=True)

            logger.info("Uploading to DB")
            insert_video(video_description_chunks, embeddings2, kbId, s3_key)
            handler_end = time.time()
            handler_duration = handler_end - handler_start
            if execution_time_embeddings1:
                execution_time_embeddings = execution_time_embeddings1  + execution_time_embeddings2
            else:
                execution_time_embeddings = execution_time_embeddings2
            credits_consumed = cost(handler_duration, execution_time_embeddings)
            message_attributes = {
               "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
               "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                         "StringValue": s3_key if s3_key else url},
               "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": type},
               "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
               "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
            }
            sending_message_attributes_to_sns(message_attributes)
            return {"KNOWLEDGEBASE.ID": {"DataType": "String", "Value": kbId},
                   "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                             "Value": s3_key if s3_key else url},
                   "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "Value": type},
                   "KNOWLEDGEBASE.STATUS": {"DataType": "String", "Value": "Completed"},
                   "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "Value": str(credits_consumed)}}
        except Exception as e:
            logger.error(f"Error processing video file: {e}")
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String", "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Failed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": "0"}
            }
            sending_message_attributes_to_sns(message_attributes)
            return {"KNOWLEDGEBASE.ID": {"DataType": "String", "Value": kbId},
                    "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                              "Value": s3_key if s3_key else url},
                    "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "Value": type},
                    "KNOWLEDGEBASE.STATUS": {"DataType": "String", "Value": "Failed"},
                    "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "Value": "0"}}

    elif type == 'image':
        try:
            logging.info('Processing image...')
            text = process_image(url, s3_key)

            logger.info("Image is processed successfully")

            logger.info("Converting image explanation to chunks")
            all_data = chunks.split_text_into_chunks(content=text)
            print(all_data)
            logger.info("Creating embeddings for chunks")
            embeddings, execution_time_embeddings = runpod_api_pipeline(substrings=all_data.get("chunks"), query='',
                                                                        top_k=5,
                                                                        threshold=100,
                                                                        task='embeddings', embedings=True)

            logger.info("Uploading to DB")
            insert_image(all_data.get("chunks"), all_data.get("indices"), embeddings, kbId, s3_key)
            handler_end = time.time()
            handler_duration = handler_end - handler_start
            credits_consumed = cost(handler_duration, execution_time_embeddings)
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                          "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Completed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": str(credits_consumed)}
            }
            sending_message_attributes_to_sns(message_attributes)
            return {"KNOWLEDGEBASE.ID": {"DataType": "String", "Value": kbId},
                    "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                              "Value": s3_key if s3_key else url},
                    "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "Value": type},
                    "KNOWLEDGEBASE.STATUS": {"DataType": "String", "Value": "Completed"},
                    "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "Value": str(credits_consumed)}}
        except Exception as e:
            logger.error(f"Error processing image file: {e}")
            message_attributes = {
                "KNOWLEDGEBASE.ID": {"DataType": "String", "StringValue": kbId},
                "KNOWLEDGEBASE.CONTENT": {"DataType": "String", "StringValue": s3_key if s3_key else url},
                "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "StringValue": type},
                "KNOWLEDGEBASE.STATUS": {"DataType": "String", "StringValue": "Failed"},
                "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "StringValue": "0"}
            }
            sending_message_attributes_to_sns(message_attributes)
            return {"KNOWLEDGEBASE.ID": {"DataType": "String", "Value": kbId},
                    "KNOWLEDGEBASE.CONTENT": {"DataType": "String",
                                              "Value": s3_key if s3_key else url},
                    "KNOWLEDGEBASE.CONTENT_TYPE": {"DataType": "String", "Value": type},
                    "KNOWLEDGEBASE.STATUS": {"DataType": "String", "Value": "Failed"},
                    "KNOWLEDGEBASE.CREDITS_CONSUMED": {"DataType": "String", "Value": "0"}}

runpod.serverless.start({
    "handler": handler
})


