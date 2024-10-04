import runpod
import logging
from modules.process_video import process_video
from modules.process_image import process_image
from modules.llama import generate as llama
from modules.transcribing_video import transcribe_video
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event):
    payload = event['input']
    url = payload['url']
    type = payload['type']
    delay = 10  # delay in seconds to capture the screens of the video
    if type == 'video':
        logging.info('Processing video...')
        processed_screens = process_video("cartoon.mp4", delay=delay)
        text_to_feed = '\n\n--------------------------------------\n\n'.join([f"{_['time']} second \n{_['text']}" for _ in processed_screens])
        print(text_to_feed)
        logger.info('transcribing video')
        audio_of_video= transcribe_video("cartoon.mp4")
        msgs = [
            {'role': 'system', 'content': "You have been provided the description of screens of a video"
                                          f" which are captured after every {delay} seconds and transcription of the whole video. Please give exact description of the "
                                          "whole video based on each video screen description and transcription of the video."},
            {'role': 'user', 'content':  f"*The description of screens of a video is* {text_to_feed} .\n "
                                         f"*The transcription of the whole video is* {audio_of_video} "}
        ]
        logging.info(msgs)
        logger.info("processing on llama")
        text = llama(messages=msgs)
    elif type == 'image':
        logging.info('Processing image...')
        text = process_image("pink.png")
    print(text)
    results = {
        "text": text,
    }
    if type == 'video':
        results["screens"] = processed_screens

    return results
runpod.serverless.start({
    "handler": handler
})


