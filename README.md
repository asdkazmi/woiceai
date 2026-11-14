# WoiceAI 2.0

WoiceAI is a platform for building AI assistants and conversational workflows powered by your own knowledge.

Create knowledge bases from documents, text, websites, audio, images, and video; configure assistants with custom instructions, retrieval settings, and citations; and connect them through visual workflows.

## Documentation

Visit the complete **[WoiceAI Documentation](https://woiceai.github.io/)** for:

- Architecture and required services
- Installation, configuration, and deployment
- AWS Lambda, ECR, S3, and SNS integration
- RunPod chat, embedding, transcription, and vision services
- MongoDB Atlas vector indexing and knowledge-base synchronization
- Chat settings, models, citations, and workflow execution
- Environment templates, API examples, and troubleshooting

You can also [browse the documentation directly on GitHub](https://github.com/woiceai/woiceai.github.io).

## Services

| Folder | Purpose |
| --- | --- |
| [web/](web/README.md) | React frontend and Express API |
| [chat-service/](chat-service/README.md) | RunPod chat, retrieval, and embeddings |
| [indexer/](indexer/README.md) | AWS Lambda ingestion and knowledge base lifecycle |
| [scraper/](scraper/README.md) | AWS Lambda website extraction and crawling |
| [audio-transcriber/](audio-transcriber/README.md) | RunPod audio transcription and speaker diarization |
| [vision-service/](vision-service/README.md) | RunPod image and video analysis and video transcription |

## How it works

The React and Express application manages users, knowledge bases, assistants, and workflows and can be deployed on **AWS EC2** or a comparable hosting platform. Original files are stored in **Amazon S3** bucket. **AWS Lambda** workers coordinate ingestion and website crawling, while **RunPod** workers handle embeddings, chat, transcription, and visual processing.

Extracted content and vectors are stored in **MongoDB Atlas** for retrieval. **MySQL** stores application metadata and workflow state. **Amazon SNS** carries indexing requests and status updates between processing workers and the web application.

For the complete architecture and setup instructions, start at **[woiceai.github.io](https://woiceai.github.io/)**.
