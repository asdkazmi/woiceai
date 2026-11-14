# Indexer

The indexer ingests knowledge-base content. It downloads source files from S3, extracts and chunks text, requests embeddings from RunPod, stores chunks and vectors in MongoDB, dispatches media processing, and publishes processing status through Amazon SNS.

It handles PDF, DOCX, TXT, text, audio, image, video, and website URL content. Website ingestion invokes the scraper Lambda, including depth-based crawling.

## Dependencies

- Python 3.9 for the AWS Lambda container image
- Amazon S3 for uploaded source files
- Amazon SNS for input and status messages
- MongoDB Atlas or a configured custom MongoDB server
- RunPod endpoints for embeddings, transcription, and vision processing
- AWS Lambda and Amazon ECR for the deployed service

## Configuration

Copy `.env.template` to `.env` for local use. In GitHub Actions, store its complete contents in the `WOICEAI_INDEXER` repository secret.

| Variable | Purpose |
| --- | --- |
| `DB_URI` | Default MongoDB connection string |
| `RUNPOD_API_KEY`, `RUNPOD_BASE_URL` | Embedding endpoint credentials and base URL |
| `TRANSCRIBER_RUNPOD_URL`, `EXPLAIN_VISION_RUNPOD_URL` | Media-processing endpoints |
| `ACCESS_KEY`, `SECRET_KEY`, `BUCKET_NAME` | S3 and Lambda access configuration |
| `RUNPOD_API_COST_PER_SECOND`, `RUNPOD_TRANSCRIBER_COST_PER_SECOND`, `COST_PER_3GB_MILLISECOND` | Processing-cost configuration |

## Run locally

```bash
cp .env.template .env
pip install -r requirements.txt
python app.py
```

The local service listens on `POST /process_files` at port `5000`. Its request body must have the SNS event structure consumed by `src/handler.py`.

## Build and deploy

Build the Lambda container from this directory.

```bash
docker build -t woice-indexer .
```

The GitHub Actions workflow at `.github/workflows/indexer.yml` builds this directory, pushes `woice-indexer:indexer` to Amazon ECR, and updates the `woiceIndexer` Lambda function. It runs on pushes to `dev-indexer`.

Before enabling deployment, create the ECR repository and Lambda image function, then configure these GitHub Actions secrets.

- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `WOICEAI_INDEXER`
