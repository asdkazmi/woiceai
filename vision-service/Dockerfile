FROM nvidia/cuda:12.2.0-base-ubuntu20.04
# Install Python 3.11 from the official Python image
FROM python:3.11-slim
# Use the official CUDA 12.2 base image
# Set environment variables for non-interactive installations
ENV DEBIAN_FRONTEND=noninteractive
# Install necessary packages and CUDA toolkit
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    curl \
    gnupg2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Add CUDA repository key
RUN apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/3bf863cc.pub
# Add CUDA repository to apt sources list
RUN echo "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/ /" \
    > /etc/apt/sources.list.d/cuda.list
# Install CUDA Toolkit 12.2
RUN apt-get update && apt-get install -y --no-install-recommends \
    cuda-toolkit-12-2 \
    && rm -rf /var/lib/apt/lists/*
# Set the CUDA environment variables
ENV PATH /usr/local/cuda-12.2/bin:${PATH}
ENV LD_LIBRARY_PATH /usr/local/cuda-12.2/lib64:${LD_LIBRARY_PATH}

RUN apt-get update && apt-get install git-lfs -y && \
    apt-get install -y libsndfile1 ffmpeg &&  \
    apt-get clean && rm -rf /var/lib/apt/lists/* &&  \
    git lfs install
RUN nvcc --version


WORKDIR /

ARG WISPER_DIR="distil-whisper/distil-large-v3"
RUN GIT_LFS_SKIP_SMUDGE=1 git clone https://huggingface.co/$WISPER_DIR $WISPER_DIR
RUN wget https://huggingface.co/$WISPER_DIR/resolve/main/model.safetensors?download=true -O $WISPER_DIR/model.safetensors

ARG QWEN_DIR="Qwen/Qwen2.5-VL-7B-Instruct"
RUN GIT_LFS_SKIP_SMUDGE=1 git clone https://huggingface.co/$QWEN_DIR $QWEN_DIR
RUN wget https://huggingface.co/$QWEN_DIR/resolve/main/model-00001-of-00005.safetensors?download=true -O $QWEN_DIR/model-00001-of-00005.safetensors
RUN wget https://huggingface.co/$QWEN_DIR/resolve/main/model-00002-of-00005.safetensors?download=true -O $QWEN_DIR/model-00002-of-00005.safetensors
RUN wget https://huggingface.co/$QWEN_DIR/resolve/main/model-00003-of-00005.safetensors?download=true -O $QWEN_DIR/model-00003-of-00005.safetensors
RUN wget https://huggingface.co/$QWEN_DIR/resolve/main/model-00004-of-00005.safetensors?download=true -O $QWEN_DIR/model-00004-of-00005.safetensors
RUN wget https://huggingface.co/$QWEN_DIR/resolve/main/model-00005-of-00005.safetensors?download=true -O $QWEN_DIR/model-00005-of-00005.safetensors

COPY requirements.txt .
RUN pip install -r requirements.txt


ENV HF_DATASETS_CACHE="/runpod-volume/datasets"
ENV HUGGINGFACE_HUB_CACHE="/runpod-volume/hub"
ENV TRANSFORMERS_CACHE="/runpod-volume/hub"

COPY src/ .
COPY .env .

CMD [ "python3", "-u", "/app.py" ]