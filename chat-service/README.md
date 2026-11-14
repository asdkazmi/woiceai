# Chat service

This directory is the WoiceAI RunPod Serverless service for chat, retrieval, and embeddings. Deploy it to a GPU-backed RunPod Serverless endpoint or run the same RunPod handler locally. It loads a local GGUF model for chat completion, a Hugging Face transformer model for GemFilter, and the Stella embedding model for retrieval against MongoDB Atlas Vector Search.

## Dependencies

- Python 3.11, NVIDIA CUDA 12.2, and a CUDA-capable GPU
- MongoDB Atlas with the collections and vector indexes used by the WoiceAI knowledge base
- RunPod Serverless for deployment, or the RunPod Python framework for local serving
- A Hugging Face account with access to `Meta-Llama-3.1-8B-Instruct-gptq`
- Model files placed in the Docker build context
  - `merged-q4_k_m-model.gguf`
  - `Meta-Llama-3.1-8B-Instruct-gptq/`

The Docker build downloads `dunzhang/stella_en_400M_v5` from Hugging Face. The remaining model artifacts above are required locally because the Dockerfile copies them into the image.

## Configuration

Copy `.env.template` to `.env` and supply values through a local secret manager or the RunPod endpoint environment.

| Variable | Purpose |
| --- | --- |
| `HF_TOKEN` | Hugging Face token with access to the configured model |
| `DB_URI` | MongoDB connection string |

## Run locally

Install the dependencies in a CUDA-enabled Python environment and start the RunPod handler.

```bash
cp .env.template .env
pip install -r requirements.txt
python src/handler.py
```

The process registers `runpod_handler` with the RunPod framework. Use a GPU-enabled environment with the required model files in the service root.

## Build and deploy

Build the container from this directory after placing the two required model artifacts beside `Dockerfile`.

```bash
docker build -t woiceai-chat-service .
docker tag woiceai-chat-service YOUR_REGISTRY/woiceai-chat-service:latest
docker push YOUR_REGISTRY/woiceai-chat-service:latest
```

Create or update a GPU RunPod Serverless endpoint with the pushed image, then configure the environment variables above in the endpoint settings. The service expects CUDA and enough GPU memory for the GGUF model, the transformer model, and the Stella embedding model.
