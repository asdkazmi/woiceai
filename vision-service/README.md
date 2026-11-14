# Vision service

This RunPod worker describes images and video frames, transcribes speech from video, and can index the resulting text in MongoDB using embeddings from a separate RunPod endpoint.

## Models and build

Build from this directory on a host that can reach Hugging Face. The Dockerfile uses Python 3.11 and CUDA 12.2 and downloads Qwen2.5-VL-7B-Instruct for visual analysis and Distil-Whisper large-v3 for speech transcription. The image includes their weights. [Qwen vision model](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) · [Distil-Whisper model](https://huggingface.co/distil-whisper/distil-large-v3)

The Dockerfile expects a local `.env` file in the build context. Create an empty file if one is absent and supply actual credentials at runtime.

```bash
touch .env
docker build -t woiceai-vision-service .
```

## Runtime configuration

Use [.env.template](.env.template) as a checklist. Set `ACCESS_KEY`, `SECRET_KEY`, and `BUCKET_NAME` for S3 media and `TOPIC_ARN` for SNS status updates. Configure `DB_URI`, `RUNPOD_API_KEY`, and `RUNPOD_BASE_URL` for indexing, plus `RUNPOD_API_COST_PER_SECOND` and `COST_PER_3GB_MILLISECOND` for usage calculations.

## Run locally or deploy

On an NVIDIA GPU host with GPU-enabled Docker, supply a separate private runtime env file containing `KEY=value` entries.

```bash
docker run --rm --gpus all --env-file /path/to/vision-runtime.env -p 8000:8000 woiceai-vision-service python -u /app.py --rp_serve_api --rp_api_host 0.0.0.0
```

Use [src/test_input.json](src/test_input.json) as a request example. Replace its sample values for your environment. For deployment, push the image to a registry and select it in a GPU RunPod Serverless endpoint with enough memory for both models. Set the runtime variables on the endpoint.
