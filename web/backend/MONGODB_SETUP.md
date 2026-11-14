# MongoDB Setup for URL Tree Feature

## Overview
This feature allows users to view the hierarchical tree structure of scraped web pages when clicking on a URL in the knowledge base detail page.

## MongoDB Configuration

### Connection String Location
Store your MongoDB connection string in the `.env` file in the backend directory:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=woice-ai-kb
```

### Connection String Formats

**Standard MongoDB:**
```
mongodb://username:password@host:port/database?authSource=admin
```

**MongoDB Atlas (Cloud):**
```
mongodb+srv://username:password@cluster.mongodb.net/database
```

**Example:**
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/woice-ai-kb?authSource=admin
# OR for MongoDB Atlas:
MONGODB_URI=mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/woice-ai-kb
MONGODB_DATABASE=woice-ai-kb
```

## Database Structure

- **Database Name:** `woice-ai-kb`
- **Collection Name:** `tree-of-urls`

### Document Structure
```json
{
  "_id": "694aca9591dc180542e6c6fa",
  "url": "https://rev9solutions.com",
  "tree": [
    {
      "parent_url": "https://rev9solutions.com",
      "url": "https://rev9solutions.com/gallery"
    },
    {
      "parent_url": "https://rev9solutions.com/blog",
      "url": "https://rev9solutions.com/blog/topics/artificial-intelligence"
    }
  ]
}
```

## Installation

1. Install MongoDB driver:
```bash
cd woice-ai-react-express/backend
npm install mongodb
```

2. Add MongoDB connection string to `.env` file (see above)

3. Restart the backend server

## Features

### Backend
- **MongoDB Service** (`src/services/mongodbService.ts`):
  - Connects to MongoDB on server startup
  - Fetches URL tree documents
  - Builds hierarchical tree structure from flat tree array

- **API Endpoint** (`/api/url-tree/:url`):
  - GET endpoint to fetch URL tree structure
  - Requires authentication
  - Returns hierarchical tree structure

### Frontend
- **URL Tree Service** (`src/services/urlTreeService.ts`):
  - Fetches URL tree data from backend API

- **URL Tree Modal** (`src/components/UrlTreeModal.tsx`):
  - Displays hierarchical tree structure
  - Expandable/collapsible nodes
  - Clickable URLs that open in new tab
  - Shows total page count

- **Knowledge Base Detail** (`src/components/KnowledgeBaseDetail.tsx`):
  - URLs are now clickable buttons that open the tree modal
  - Modal shows all scraped pages under the root URL

## Usage

1. When viewing a knowledge base detail page, click on any URL in the content table
2. A modal will open showing the complete tree structure of all scraped pages
3. Click on any URL in the tree to open it in a new tab
4. Expand/collapse nodes to navigate the tree structure

## Notes

- MongoDB connection is optional - if `MONGODB_URI` is not set, the feature will be disabled but the server will still run
- The tree structure is built from the flat `tree` array in MongoDB documents
- The root URL is displayed separately at the top of the modal
- Child pages are displayed in an indented, hierarchical structure

