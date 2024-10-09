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

load_dotenv()

logger = logging.getLogger()
logger.setLevel(logging.INFO)



def handler(event):
    handler_start = time.time()
    payload = event['input']
    url = payload.get('url')
    s3_key = payload.get('s3_key')
    type = payload['type']
    delay = payload.get('delay', 10) # delay in seconds to capture the screens of the video
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
            logging.info(f"The video is successfully downloaded as {video_path}")
            logging.info('Processing video...')
            processed_screens = process_video(video_path, delay=delay)
            logger.info('Transcribing video')
            audio_of_video = transcribe_video(video_path)
            os.remove(video_path)
            results = {
                "text": processed_screens,
                "transcription": audio_of_video
            }
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            return {
                "error": e
            }
    elif type == 'image':
        try:
            logging.info('Processing image...')
            text = process_image(url, s3_key)
            results = {
                "text": text,
            }
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {
                "error": e
            }
    handler_end = time.time()
    handler_duration = handler_end - handler_start
    logger.info(f"Handler duration: {handler_duration}")
    return results
runpod.serverless.start({
    "handler": handler
})


