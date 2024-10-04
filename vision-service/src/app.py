import runpod
import logging
from modules.process_video import process_video
from modules.process_image import process_image
from modules.llama import generate as llama
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event):
    payload = event['input']
    url = payload['url']
    type = payload['type']
    if type == 'video':
        logging.info('Processing video...')
        processed_screens = process_video("video.mp4")
        logger.info(processed_screens) # TODO: Delete this log
        kwargs={

        }
        msgs = [
            {'role': 'system', 'content': "You have been provided the description of screens of a video"
                                          " which are captured after every 5 seconds. Please summarize the "
                                          "whole video based on each screen description"},
            {'role': 'user', 'content': '\n\n--------------------------------------\n\n'.join([f"{_['time']} second \n{_['text']}" for _ in processed_screens])}
        ]
        logger.info("processing on llama")
        text = llama(messages=msgs,  kwargs=kwargs)
    elif type == 'image':
        logging.info('Processing image...')
        text = process_image("pink.png")

    results = {
        "text": text,
    }
    if type == 'video':
        results["screens"] = processed_screens

    return results
runpod.serverless.start({
    "handler": handler
})


