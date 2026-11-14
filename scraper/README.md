# Scraper

The scraper fetches websites for a knowledge base. It uses Selenium and headless Chromium to load pages, extracts readable text and links, filters URLs, chunks content, generates embeddings through RunPod, stores results in MongoDB, and reports status through Amazon SNS.

The indexer invokes this service when a knowledge-base item has URL content. The scraper returns discovered URLs and tree metadata so the indexer can continue a depth-based crawl.

## Dependencies

- Python 3.6 for the AWS Lambda container image
- Selenium, ChromeDriver, and serverless Chromium
- MongoDB Atlas or a configured custom MongoDB server
- RunPod embeddings endpoint
- Amazon SNS for processing status
- AWS Lambda and Amazon ECR for deployment

The Dockerfile downloads ChromeDriver and `serverless-chrome` during the image build. The service needs outbound network access to crawl source websites.

## Configuration

Copy `.env.template` to `.env` for local use. In GitHub Actions, store its complete contents in the `WOICEAI_SCRAPER` repository secret.

| Variable | Purpose |
| --- | --- |
| `DB_URI` | Default MongoDB connection string |
| `RUNPOD_API_KEY`, `RUNPOD_BASE_URL` | Embedding endpoint credentials and base URL |
| `ACCESS_KEY`, `SECRET_KEY` | AWS access configuration |
| `RUNPOD_API_COST_PER_SECOND`, `COST_PER_3GB_MILLISECOND` | Processing-cost configuration |

## Run locally

```bash
cp .env.template .env
pip install -r requirements.txt
python app.py
```

The local service listens on `POST /scraper` at port `5000`.

## Build and deploy

Build the Lambda container from this directory.

```bash
docker build -t woice-scraper .
```

The GitHub Actions workflow at `.github/workflows/scraper.yml` builds this directory, pushes `woice-scraper:scraper` to Amazon ECR, and updates the `woiceScraper` Lambda function. It runs on pushes to `dev-scraper`.

Before enabling deployment, create the ECR repository and Lambda image function, then configure these GitHub Actions secrets.

- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `WOICEAI_SCRAPER`
