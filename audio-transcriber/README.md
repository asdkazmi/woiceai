# Audio transcriber

This RunPod worker converts audio to text, optionally identifies speakers, and can index transcript chunks in MongoDB using embeddings from a separate RunPod endpoint.

## Models and build

Build from this directory. The Dockerfile uses Python 3.11 and CUDA 12.2 and downloads NVIDIA NeMo models for speech processing and pyannote models for speaker diarization. Grant your Hugging Face account access to the gated pyannote models before building. Set `HUGGINGFACE_TOKEN` in your build environment and use a trusted build host. The current Dockerfile passes the token as a build argument, so keep the resulting image and build cache private.

```bash
docker build --build-arg HUGGINGFACE_TOKEN -t woiceai-audio-transcriber .
```

Model sources include [Parakeet RNNT](https://huggingface.co/nvidia/parakeet-rnnt-0.6b), [FastPitch](https://huggingface.co/nvidia/tts_en_fastpitch), [HiFi-GAN](https://huggingface.co/nvidia/tts_hifigan), [speaker diarization](https://huggingface.co/pyannote/speaker-diarization-3.1), [segmentation](https://huggingface.co/pyannote/segmentation-3.0), and [speaker embeddings](https://huggingface.co/pyannote/wespeaker-voxceleb-resnet34-LM).

## Runtime configuration

Use [.env.template](.env.template) as a checklist. Set `ACCESS_KEY`, `SECRET_KEY`, and `BUCKET_NAME` for S3-backed audio, and `TOPIC_ARN` for SNS status updates. Configure `DB_URI`, `RUNPOD_API_KEY`, and `RUNPOD_BASE_URL` for indexing, plus `RUNPOD_API_COST_PER_SECOND` and `RUNPOD_TRANSCRIBER_COST_PER_SECOND` for usage calculations.

## Run locally or deploy

On an NVIDIA GPU host with GPU-enabled Docker, create a private runtime env file with `KEY=value` entries and start the local RunPod HTTP server.

```bash
docker run --rm --gpus all --env-file .env -p 8000:8000 woiceai-audio-transcriber python -u /app.py --rp_serve_api --rp_api_host 0.0.0.0
```

Use [src/test_input.json](src/test_input.json) as a request example. Replace its sample values for your environment. For deployment, push the image to a private registry, select it in a GPU RunPod Serverless endpoint, and configure the runtime variables there.
