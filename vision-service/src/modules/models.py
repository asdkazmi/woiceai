from transformers import (
    AutoModelForCausalLM,
    AutoProcessor,
)
import torch
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

repo_name = "cyan2k/molmo-7B-D-bnb-4bit"
arguments = {"device_map": "auto", "torch_dtype": "auto", "trust_remote_code": True}

processor = AutoProcessor.from_pretrained(repo_name, **arguments)

device = "cuda" if torch.cuda.is_available() else "cpu"
logging.info(f'Loading model {repo_name}... on {device}')
model = AutoModelForCausalLM.from_pretrained(repo_name, **arguments)