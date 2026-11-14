# Chat service

This directory is the WoiceAI RunPod Serverless service for chat, retrieval, and embeddings. Deploy it to a GPU-backed RunPod Serverless endpoint or run the same RunPod handler locally. It loads a local Qwen GGUF model for chat completion, a Llama 3.1 transformer model for GemFilter, and the Stella embedding model for retrieval against MongoDB Atlas Vector Search.

## Dependencies

- Python 3.11, NVIDIA CUDA 12.2, and a CUDA-capable GPU
- MongoDB Atlas with the collections and vector indexes used by the WoiceAI knowledge base
- RunPod Serverless for deployment, or the RunPod Python framework for local serving
- Model files placed in the Docker build context
  - a Qwen GGUF file
  - `Meta-Llama-3.1-8B-Instruct-gptq/`

## Models

### Qwen generation model

`src/handler.py` loads `merged-q4_k_m-model.gguf` with `llama-cpp-python`. This is the model that generates chat responses and rewrites queries.

Download the GGUF variant you intend to serve from [unsloth/Qwen3-14B-GGUF](https://huggingface.co/unsloth/Qwen3-14B-GGUF), then place it in this directory. Update `model_path` in `src/handler.py` to the exact downloaded filename. You can instead rename the downloaded file to `merged-q4_k_m-model.gguf` and retain the existing configuration.

### Llama GemFilter model

The transformer model comes from [shuyuej/Meta-Llama-3.1-8B-Instruct-GPTQ](https://huggingface.co/shuyuej/Meta-Llama-3.1-8B-Instruct-GPTQ). Download its files into a directory named `Meta-Llama-3.1-8B-Instruct-gptq/` beside the Dockerfile because the Dockerfile copies that exact directory into the image.

This model is used by GemFilter to select and reduce retrieved knowledge-base content before Qwen generates the final response. It does not generate the chat response directly.

The Docker build downloads `dunzhang/stella_en_400M_v5` from Hugging Face for embeddings. The Qwen and GemFilter artifacts above must be supplied in the Docker build context.

## Configuration

Copy `.env.template` to `.env` and supply values through a local secret manager or the RunPod endpoint environment.

| Variable | Purpose |
| --- | --- |
| `HF_TOKEN` | Reserved for a configuration that downloads the GemFilter model from Hugging Face. The current offline container build uses the local model artifact instead. |
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
