import logging
import torch
from transformers import Qwen2_5_VLForConditionalGeneration, AutoTokenizer, AutoProcessor

logger = logging.getLogger()
logger.setLevel(logging.INFO)


device = "cuda" if torch.cuda.is_available() else "cpu"
logging.info(f'Loading model Qwen/Qwen2.5-VL-7B-Instruct ... on {device}')
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-7B-Instruct",
    torch_dtype=torch.bfloat16,
    attn_implementation="flash_attention_2",
    device_map=device
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct", use_fast=True)