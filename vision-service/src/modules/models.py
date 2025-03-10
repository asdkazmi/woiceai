import logging

import torch
from transformers import Qwen2_5_VLForConditionalGeneration, AutoTokenizer, AutoProcessor


logger = logging.getLogger()
logger.setLevel(logging.INFO)



device = "cuda" if torch.cuda.is_available() else "cpu"
logging.info(f'Loading model Qwen/Qwen2.5-VL-7B-Instruct ... on {device}')
cache_dir="/mnt/bri-ssd/drive/rev9ai/huggingface/hub/models--Qwen--Qwen2.5-VL-7B-Instruct"
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "/mnt/bri-ssd/drive/rev9ai/huggingface/hub/models--Qwen--Qwen2.5-VL-7B-Instruct/snapshots/6e6556e8ce728c7b3e438d75ebf04ec93403dc19",
    torch_dtype=torch.bfloat16,
    attn_implementation="flash_attention_2",
    device_map=device,
    cache_dir=cache_dir,
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct", use_fast=True)