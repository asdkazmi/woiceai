import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import ffmpeg
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

#Loading model and processor
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "distil-whisper/distil-large-v3"

logger.info(f"Loading model {model_id}")
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
)
logger.info(f"Transferring model {model_id} to {device}")
model.to(device)
processor = AutoProcessor.from_pretrained(model_id)
pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        max_new_tokens=128,
        chunk_length_s=25,
        batch_size=16,
        torch_dtype=torch_dtype,
        device=device,
    )

def transcribe_video(input_file):

    #converting video to audio
    try:
        ffmpeg.input(input_file).output("audio.wav").run()
        logger.info(f"The file is successfully converted to: audio.wav")
    except Exception as e:
        logger.info(f"An error occurred: {e}")

    #transcribing audio
    result = pipe("audio.wav")
    os.remove("audio.wav")
    return result["text"]
















