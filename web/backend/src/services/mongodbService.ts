import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export interface UrlTreeItem {
  parent_url: string;
  url: string;
  scrapped?: boolean;
}

export interface UrlTreeDocument {
  _id: ObjectId | string;
  url: string;
  tree: UrlTreeItem[];
}

/**
 * Initialize MongoDB connection
 */
export async function connectMongoDB(): Promise<void> {
  if (client && db) {
    return; // Already connected
  }

  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DATABASE || 'woice-ai-kb';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(databaseName);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Get MongoDB database instance
 */
export function getMongoDB(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
}

/**
 * Get URL tree from MongoDB by URL
 * @param url The root URL to fetch tree for
 * @returns The URL tree document or null if not found
 */
export async function getUrlTree(url: string): Promise<UrlTreeDocument | null> {
  try {
    const database = getMongoDB();
    const collection: Collection<UrlTreeDocument> = database.collection('tree-of-urls');
    
    const document = await collection.findOne({ url });
    
    if (!document) {
      return null;
    }

    return {
      _id: document._id.toString(),
      url: document.url,
      tree: document.tree || [],
    };
  } catch (error) {
    console.error('Error fetching URL tree from MongoDB:', error);
    throw error;
  }
}

/**
 * Get URL tree from MongoDB by tree document ID
 * @param treeDocumentId The MongoDB ObjectId string of the tree document
 * @returns The URL tree document or null if not found
 */
export async function getUrlTreeByDocumentId(treeDocumentId: string): Promise<UrlTreeDocument | null> {
  try {
    const database = getMongoDB();
    const collection: Collection<UrlTreeDocument> = database.collection('tree-of-urls');
    
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(treeDocumentId);
    } catch (error) {
      console.error('Invalid ObjectId format:', treeDocumentId);
      return null;
    }
    
    const document = await collection.findOne({ _id: objectId as any });
    
    if (!document) {
      return null;
    }

    return {
      _id: document._id.toString(),
      url: document.url,
      tree: document.tree || [],
    };
  } catch (error) {
    console.error('Error fetching URL tree from MongoDB by document ID:', error);
    throw error;
  }
}

/**
 * Build a hierarchical tree structure from flat tree array
 */
export function buildTreeStructure(
  rootUrl: string,
  treeItems: UrlTreeItem[]
): TreeNode {
  // Create a map of all URLs
  const urlMap = new Map<string, TreeNode>();
  
  // Initialize root node
  const root: TreeNode = {
    url: rootUrl,
    parentUrl: null,
    children: [],
  };
  urlMap.set(rootUrl, root);

  // Process all tree items
  for (const item of treeItems) {
    // Create or get parent node
    let parentNode = urlMap.get(item.parent_url);
    if (!parentNode) {
      parentNode = {
        url: item.parent_url,
        parentUrl: null,
        children: [],
      };
      urlMap.set(item.parent_url, parentNode);
    }

    // Create or get child node
    let childNode = urlMap.get(item.url);
    if (!childNode) {
      childNode = {
        url: item.url,
        parentUrl: item.parent_url,
        scrapped: item.scrapped,
        children: [],
      };
      urlMap.set(item.url, childNode);
    } else {
      // Update parent URL if not set
      childNode.parentUrl = item.parent_url;
      // Update scrapped status if available
      if (item.scrapped !== undefined) {
        childNode.scrapped = item.scrapped;
      }
    }

    // Add child to parent if not already added
    if (!parentNode.children.some(c => c.url === item.url)) {
      parentNode.children.push(childNode);
    }
  }

  // Return root node
  return root;
}

export interface TreeNode {
  url: string;
  parentUrl: string | null;
  scrapped?: boolean;
  children: TreeNode[];
}

