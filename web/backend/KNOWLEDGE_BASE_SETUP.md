# Knowledge Base System Setup

This document describes the knowledge base system implementation that mirrors the Laravel backend functionality.

## Features

- ✅ Create, read, update, and delete knowledge bases
- ✅ Support for multiple content types:
  - Files (PDF, DOC, DOCX, XLSX)
  - URLs (with configurable depth for web scraping)
  - Text content
  - Audio files (MP3, WAV)
  - Video files (MP4, MOV, AVI, etc.)
  - Images (JPG, PNG, GIF, etc.)
- ✅ AWS S3 integration for file storage
- ✅ AWS SNS integration for triggering vector database indexing
- ✅ AWS Lambda integration for querying knowledge bases
- ✅ Automatic content indexing into vector database

## Database Schema

### knowledge_bases table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `name` - Knowledge base name
- `knowledge_base_api_id` - API ID for external systems
- `status` - Status: pending, queued, processing, indexed, failed
- `created_at`, `updated_at` - Timestamps

### knowledge_base_contents table
- `id` - Primary key
- `knowledge_base_id` - Foreign key to knowledge_bases table
- `content` - Content identifier (S3 path, URL, or text ID)
- `text_content` - Full text content (for text type)
- `type` - Content type: file, url, text, audio, video, image
- `status` - Processing status: pending, queued, processing, completed, failed
- `depth` - URL scraping depth (for URL type)
- `filename` - Original filename (for file types)
- `transcription` - Audio/video transcription
- `child_pages` - JSON array of child pages (for URL type)
- `created_at`, `updated_at` - Timestamps

## API Endpoints

### GET /api/knowledge-base
Get all knowledge bases for the authenticated user.

**Response:**
```json
{
  "message": "Knowledge bases fetched successfully",
  "data": {
    "knowledgeBases": [...]
  }
}
```

### GET /api/knowledge-base/:id
Get a single knowledge base by ID with all its contents.

**Response:**
```json
{
  "message": "Knowledge base fetched successfully",
  "data": {
    "knowledgeBase": {
      "id": 1,
      "userId": 1,
      "name": "My Knowledge Base",
      "status": "indexed",
      "knowledgeBaseContents": [...]
    }
  }
}
```

### POST /api/knowledge-base
Create a new knowledge base.

**Request (multipart/form-data):**
- `name` (required) - Knowledge base name
- `files[]` (optional) - File uploads
- `urls` (optional) - JSON array of URLs: `[{"url": "https://example.com", "depth": 1}]`
- `texts` (optional) - JSON array of text strings: `["text1", "text2"]`
- `audios[]` (optional) - Audio file uploads
- `videos[]` (optional) - Video file uploads
- `images[]` (optional) - Image file uploads
- `depth` (optional) - Default URL depth

**Example:**
```bash
curl -X POST http://localhost:5000/api/knowledge-base \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=My Knowledge Base" \
  -F "files[]=@document.pdf" \
  -F 'urls=[{"url":"https://example.com","depth":2}]' \
  -F 'texts=["Some text content"]'
```

### PATCH /api/knowledge-base/:id
Update a knowledge base.

**Request (multipart/form-data):**
- `name` (optional) - New name
- `files[]` (optional) - New files to add
- `urls` (optional) - New URLs to add
- `texts` (optional) - New texts to add
- `audios[]`, `videos[]`, `images[]` (optional) - New media files
- `deleteIds` (optional) - JSON array of content IDs to delete: `[1, 2, 3]`

### DELETE /api/knowledge-base/:id
Delete a knowledge base and all its contents.

**Response:**
```json
{
  "message": "Knowledge base deleted successfully"
}
```

## Environment Variables

Add these to your `.env` file:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your-bucket-name

# Note: SNS Topic ARN and Lambda Function ARN are hardcoded to match Laravel backend:
# SNS Topic: arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase
# Lambda Function: arn:aws:lambda:us-east-1:471112754613:function:devWoiceChat
```

## Required NPM Packages

Install the following packages:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/client-sns @aws-sdk/client-lambda multer
npm install --save-dev @types/multer
```

## How It Works

1. **File Upload**: Files are uploaded to AWS S3 using the S3 service
2. **Content Storage**: Content metadata is stored in the database
3. **Indexing Trigger**: SNS messages are published to trigger Lambda functions for vector database indexing
4. **Status Tracking**: Content status is tracked through: pending → queued → processing → completed/failed

## Content Types

### Files
- Supported: PDF, DOC, DOCX, XLSX
- Max size: 10MB per file
- Stored in S3, indexed by Lambda

### URLs
- Supports web scraping with configurable depth (1-10)
- Depth determines how many levels of links to follow
- Indexed by Lambda function

### Text
- Plain text content
- Stored directly in database
- Indexed by Lambda function

### Audio
- Supported: MP3, WAV, MPEG
- Max size: 20MB per file
- Transcribed and indexed

### Video
- Supported: MP4, MOV, AVI, WMV, MKV, FLV, WEBM, MPEG, MPG, M4V, 3GP, 3G2
- Max size: 100MB per file
- Transcribed and indexed

### Images
- Supported: JPG, JPEG, PNG, GIF, BMP, TIFF, TIF, SVG, WEBP
- Max size: 30MB per file
- Indexed by Lambda function

## Error Handling

- Validation errors return 422 status with error details
- Not found errors return 404 status
- Server errors return 500 status
- Delete operations fail if content is still being processed

## Environment Variables

### AWS Configuration
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- `AWS_S3_BUCKET` - S3 bucket name for file storage
- `AWS_SNS_TOPIC_ARN` - SNS topic ARN for triggering indexing
- `AWS_SSO_PROFILE` - Optional AWS SSO profile name

### Runpod Configuration (for Qwen LLM)
- `RUNPOD_API_ENDPOINT` - Runpod API endpoint (default: https://api.runpod.ai/v2/t7pk7qccoaohob)
- `RUNPOD_API_KEY` - Runpod API key for authentication

## Next Steps

1. Set up AWS credentials and S3 bucket
2. Configure SNS topic for indexing
3. Ensure Lambda functions are properly configured
4. Configure Runpod API credentials for Qwen LLM
5. Test the API endpoints
6. Integrate with frontend dashboard

