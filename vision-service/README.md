This is runpod server less api which works on explaining vision whether its an image or a video.

This api can take one of these four inputs

1.
   _{
        "url":"Your provided url for video",
        "type": "video",
        "delay": 5
    }_

2.
   _{
        "url":"Your provided url for image",
        "type": "image"
        "delay": 9
    }_

2.
   _{
        "s3_key":"s3_key for video",
        "type": "video"
        "delay": 7
    }_
2.
   _{
        "s3_key":"s3_key for image",
        "type": "image"
        "delay": 10
    }_

`delay` is the duration (in seconds) that determines how long to wait between displaying each frame in the video or animation.

This api gets one of these inputs. 

If type is image then it loads image from url or dwnload from s3_key whatever is provided and processes image using model **"cyan2k/molmo-7B-D-bnb-4bit"** and generates text for the image and return text as 
_results = {
                "text": text,
            }_

If type is video then it downloads video from s3_key or url whatever is provided. Then,  captures screen of video after every delay seconds (which you have provided in delay parameter and by default is 10 seconds) and stores all the screens in an array.
Then processes all the screens of the array using model **"cyan2k/molmo-7B-D-bnb-4bit"** and generates text for all screens
This text will be for approximately whole video.
THen if video has audio, it converts video into audio and transcribes audio using **"distil-whisper/distil-large-v3"** and generates transcript.
Then this api will return text of all screens with time in text parameter and transcript in transcript parameter as
_results = {
                "text": processed_screens,
                "transcription": audio_of_video
            }_