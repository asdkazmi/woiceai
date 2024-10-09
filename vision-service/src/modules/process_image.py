import os
import logging
from .models import processor,model
from transformers import GenerationConfig
from PIL import Image
import requests

from .s3download import download_file_from_s3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def process_image(url, s3_key):
    if url:
        logger.info("Fetching image from url")
        image = Image.open(requests.get(url, stream=True).raw)
    elif s3_key:
        image_path = download_file_from_s3(s3_key)
        image = Image.open(image_path)  # Load image from local path
        os.remove(image_path)
    logger.info("The image is being processed")
    if image.mode != "RGB":
        image = image.convert("RGB")
    inputs = processor.process(
        images=[image],
        text="Describe this image.",
    )

    inputs = {k: v.to(model.device).unsqueeze(0) for k, v in inputs.items()}

    # generate output; maximum 200 new tokens; stop generation when <|endoftext|> is generated
    output = model.generate_from_batch(
        inputs,
        GenerationConfig(max_new_tokens=200, stop_strings="<|endoftext|>"),
        tokenizer=processor.tokenizer,
    )

    # only get generated tokens; decode them to text
    generated_tokens = output[0, inputs["input_ids"].size(1):]
    generated_text = processor.tokenizer.decode(generated_tokens, skip_special_tokens=True)
       # print the generated text
    return generated_text