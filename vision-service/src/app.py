import runpod
import logging
import time
from modules.process_video import process_video
from modules.process_image import process_image
from modules.transcribing_video import transcribe_video
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event):
    handler_start = time.time()
    payload = event['input']
    url = payload['url']
    type = payload['type']
    delay = 10  # delay in seconds to capture the screens of the video
    if type == 'video':
        try:
            logging.info('Processing video...')
            processed_screens = process_video("cartoon.mp4", delay=delay)
            logger.info('Transcribing video')
            audio_of_video= transcribe_video("cartoon.mp4")
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
            text = process_image("pink.png")
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


