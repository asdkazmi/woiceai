import requests
import shutil
from qwen_vl_utils import process_vision_info
from .models import processor, model
from .video_to_image_frames import video_to_image_paths


def download_video_from_url(url):
    try:
        filename = "video.mp4"
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            return filename
    except:
        return None


def process_video(url, delay=1):
    video_frames_paths = video_to_image_paths(url, delay=delay)
    all_video_frames_results = list()
    generated_text = ""
    for i in range(len(video_frames_paths)):
        input_text = f"Explain the scene {i + 1} of a video within 100 words and the summary should not exceed more than 100 words, must remember it."
        if len(generated_text):
            input_text += f"Here is the description of previous scene: \n{generated_text}.\n\n\n * Strictly Do not repeat the same description of previous scene in current scene {i + 1} and only tell about what happened next in the current scene {i + 1} as compared to previous scene. Strictly, explain only what changed in the current scene {i + 1} as compared to the previous scene described.*"
        messages = [
            {
                "role": "system",
                "content": f"You are an advanced vision AI model specializing in detailed image and video analysis. The frames of video are captured after every {delay} seconds. You have been given with a frame of a video and explanation of its previous frame, You have to explain current frame as transition of video from previous frame description. You strictly do not have to repeat same previous scene description in current scene. You have to give explanation of frame as you are giving explanation of video"
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": f"{video_frames_paths[i]}"
                    },
                    {
                        "type": "text",
                        "text": f"{input_text}"
                    }
                ]
            }
        ]

        # Preparation for inference
        text = processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        inputs = inputs.to("cuda")
        generated_ids = model.generate(**inputs, max_new_tokens=300)
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        generated_text = processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )
        all_video_frames_results.extend(generated_text)
    for i, result in enumerate(all_video_frames_results):
        all_video_frames_results[i] = {'time': i * delay, 'text': result}

    shutil.rmtree("/tmp/frames")
    return all_video_frames_results
