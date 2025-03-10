import logging
import os
import requests
from qwen_vl_utils import process_vision_info

from .models import processor, model
from .s3download import download_file_from_s3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def download_image_from_url(url):
    try:
        filename = "image.png"
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024):  # Smaller chunk size for images
                    f.write(chunk)
            return filename
    except Exception as e:
        logger.error(f"Error: {e}")
        return None



def process_image(url, s3_key):
    if url:
        logger.info("Downloading image from url")
        image_path = download_image_from_url(url)
    elif s3_key:
        image_path = download_file_from_s3(s3_key)
    logger.info("The image is being processed")
    messages = [
        {
            "role": "system",
            "content": "You are an advanced vision AI model specializing in detailed image analysis. When given an image, provide an in-depth description covering key aspects. Be precise, structured, and informative. You have to give overview what overall image is about and what is presented in the image. Also specify if anything seems happening in the image."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "image": f"{image_path}"
                },
                {
                    "type": "text",
                    "text": "Analyze this image in detail and strictly describe its each and every part. Description should not exceed more than 300 words."
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
    # Inference: Generation of the output
    generated_ids = model.generate(**inputs, max_new_tokens=300)
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]


    generated_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )
    os.remove(image_path)
    return generated_text[0]
