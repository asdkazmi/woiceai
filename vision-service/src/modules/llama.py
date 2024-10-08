"""from llama_cpp import Llama
import logging
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

model_path = "/mnt/ssd/models/Llama-3.1-8B-GGUF/Hermes-3-Llama-3.1-8B.Q4_K_M.gguf"

llm = Llama(
    model_path=model_path,  # Download the model file first
    n_ctx=32000,  # The max sequence length to use - note that longer sequence lengths require much more resources
    n_threads=8,  # The number of CPU threads to use, tailor to your system and the resulting performance
    n_gpu_layers=-1,  # The number of layers to offload to GPU, if available. -1 for offloading all layers.
)
logger.info(f"llama loaded")
def generate(messages, kwargs={}):
    try:
        handler_start = time.time()
        response = llm.create_chat_completion(
            messages=messages  # Pass keyword arguments specific to create_chat_completion
        )
        handler_end = time.time()
        handler_duration = handler_end - handler_start
        logger.info(f"the taken by llama is {handler_duration}")
        return response['choices'][0]['message']['content']
    except Exception as e:
        logger.error(f"Error generating data: {e}")
        return None"""