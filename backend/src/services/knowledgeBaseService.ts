import { IKnowledgeBase, IKnowledgeBaseContent, KnowledgeBase, KnowledgeBaseContent, IKnowledgeBaseWithContents, IKnowledgeBaseContentStats } from '../models/KnowledgeBase';
import { S3Service, UploadedFile } from './aws/s3Service';
import { SNSService } from './aws/snsService';
import { KnowledgeBaseContentHelper, PreparedContent } from './knowledgeBaseContentHelper';
import { RestrictedQueryService } from './restrictedQueryService';

// Extended interface for content with document URL
interface IKnowledgeBaseContentWithUrl extends IKnowledgeBaseContent {
  documentUrl?: string | null;
}

export interface CreateKnowledgeBaseData {
  name: string;
  files?: Express.Multer.File[];
  urls?: Array<string | { url: string; depth?: number }>;
  texts?: Array<string | { text: string }>;
  audios?: Express.Multer.File[];
  videos?: Express.Multer.File[];
  images?: Express.Multer.File[];
  restrictedQueries?: string[];
  depth?: number;
}

export interface UpdateKnowledgeBaseData {
  name?: string;
  files?: Express.Multer.File[];
  urls?: Array<string | { url: string; depth?: number }>;
  texts?: Array<string | { text: string }>;
  audios?: Express.Multer.File[];
  videos?: Express.Multer.File[];
  images?: Express.Multer.File[];
  restrictedQueries?: string[];
  deleteIds?: (number | string)[];
}

export class KnowledgeBaseService {
  /**
   * Get all knowledge bases for a user
   */
  static async getAll(userId: number): Promise<(IKnowledgeBase & { contentStats?: IKnowledgeBaseContentStats })[]> {
    return KnowledgeBase.findByUserId(userId);
  }

  /**
   * Get a single knowledge base by ID
   */
  static async get(id: number, userId: number): Promise<IKnowledgeBaseWithContents | null> {
    const kb = await KnowledgeBase.findById(id, true);
    if (!kb || kb.userId !== userId) {
      return null;
    }

    // Fetch restricted queries from MongoDB and add them as content items
    let restrictedQueriesContent: IKnowledgeBaseContent[] = [];
    try {
      const restrictedQueryDoc = await RestrictedQueryService.getByKnowledgeBaseId(id, userId);
      if (restrictedQueryDoc && restrictedQueryDoc.restricted_queries.length > 0) {
        restrictedQueriesContent = restrictedQueryDoc.restricted_queries.map((query, index) => ({
          id: undefined, // No MySQL ID for MongoDB items
          knowledgeBaseId: id,
          content: query,
          textContent: query,
          type: 'restricted_query' as const,
          status: 'non-indexing' as const,
          createdAt: restrictedQueryDoc.created_at,
          updatedAt: restrictedQueryDoc.updated_at,
        }));
      }
    } catch (error) {
      console.error('Error fetching restricted queries from MongoDB:', error);
      // Continue without restricted queries if MongoDB fails
    }

    // Generate presigned URLs for file content types
    let contentsWithUrls: IKnowledgeBaseContentWithUrl[] = [];
    if (kb.knowledgeBaseContents && kb.knowledgeBaseContents.length > 0) {
      contentsWithUrls = await Promise.all(
        kb.knowledgeBaseContents.map(async (content) => {
          const contentWithUrl: IKnowledgeBaseContentWithUrl = { ...content };

          // Generate presigned URLs for file types (file, audio, video, image)
          const fileTypes = ['file', 'audio', 'video', 'image'];
          if (fileTypes.includes(content.type) && content.content) {
            try {
              const isPdf = content.content.toLowerCase().endsWith('.pdf');
              const disposition = isPdf ? 'inline' : 'attachment';
              const documentUrl = await S3Service.getPresignedUrl(content.content, 30 * 60, disposition);
              contentWithUrl.documentUrl = documentUrl;
            } catch (error) {
              console.error(`Error generating presigned URL for ${content.content}:`, error);
              contentWithUrl.documentUrl = null;
            }
          } else {
            contentWithUrl.documentUrl = null;
          }

          return contentWithUrl;
        })
      );
    }

    // Combine regular content with restricted queries
    const allContents = [...contentsWithUrls, ...restrictedQueriesContent];

    return { ...kb, knowledgeBaseContents: allContents } as IKnowledgeBaseWithContents;
  }

  /**
   * Create a new knowledge base
   */
  static async create(userId: number, data: CreateKnowledgeBaseData): Promise<IKnowledgeBase> {
    // Create the knowledge base
    const knowledgeBase = await KnowledgeBase.create({
      userId,
      name: data.name,
      status: 'pending',
    });

    // Process and store content
    await this.storeContent(data, knowledgeBase.id!);

    // Update status to processing
    await KnowledgeBase.update(knowledgeBase.id!, { status: 'processing' });

    return await KnowledgeBase.findById(knowledgeBase.id!, true) as IKnowledgeBase;
  }

  /**
   * Update a knowledge base
   */
  static async update(
    id: number,
    userId: number,
    data: UpdateKnowledgeBaseData
  ): Promise<IKnowledgeBase | null> {
    const kb = await KnowledgeBase.findById(id);
    if (!kb || kb.userId !== userId) {
      return null;
    }

    // Update name if provided
    if (data.name) {
      await KnowledgeBase.update(id, { name: data.name });
    }

    // Store new content
    if (data.files || data.urls || data.texts || data.audios || data.videos || data.images || data.restrictedQueries) {
      await this.storeContent(data, id);
    }

    // Delete content if requested
    if (data.deleteIds && data.deleteIds.length > 0) {
      await this.deleteContent(data.deleteIds, id);
    }

    return await KnowledgeBase.findById(id, true) as IKnowledgeBase;
  }

  /**
   * Delete a knowledge base
   * Sets status to 'deleting' and sends SNS event
   * Actual deletion happens when webhook receives completion status
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const kb = await KnowledgeBase.findById(id);
    if (!kb || kb.userId !== userId) {
      return false;
    }

    // Don't allow deletion if already deleting
    if (kb.status === 'deleting') {
      return false;
    }

    // Check if any content is in progress (except deleting)
    const inProgressCount = await KnowledgeBaseContent.countInProgress(id);
    if (inProgressCount > 0) {
      return false;
    }

    // Set status to 'deleting' to show progress
    await KnowledgeBase.update(id, { status: 'deleting' });

    // Publish delete event to SNS with DELETE_KNOWLEDGEBASE action
    // The actual deletion from MongoDB and database cleanup happens
    // when the webhook receives the completion status from the Lambda function
    await SNSService.publishKnowledgeBaseDeleted(id);

    // Return true to indicate deletion process has started
    // The actual DB deletion will happen via webhook
    return true;
  }

  /**
   * Complete deletion of a knowledge base
   * Called by webhook when deletion is confirmed
   */
  static async completeDeletion(id: number): Promise<boolean> {
    const kb = await KnowledgeBase.findById(id);
    if (!kb || kb.status !== 'deleting') {
      return false;
    }

    // Get all content to delete files from S3
    const contents = await KnowledgeBaseContent.findByKnowledgeBaseId(id);
    const fileContentIds = contents
      .filter((c) => ['file', 'audio', 'video', 'image'].includes(c.type))
      .map((c) => c.content);

    // Delete files from S3
    if (fileContentIds.length > 0) {
      await S3Service.deleteFiles(fileContentIds);
    }

    // Delete the knowledge base (cascade will delete contents)
    return await KnowledgeBase.delete(id);
  }

  /**
   * Store content for a knowledge base
   */
  private static async storeContent(
    data: CreateKnowledgeBaseData | UpdateKnowledgeBaseData,
    knowledgeBaseId: number
  ): Promise<void> {
    // Upload files to S3
    const uploadedFiles: UploadedFile[] = [];
    const uploadedAudios: UploadedFile[] = [];
    const uploadedVideos: UploadedFile[] = [];
    const uploadedImages: UploadedFile[] = [];

    if (data.files && data.files.length > 0) {
      uploadedFiles.push(...(await S3Service.uploadFiles(data.files)));
    }
    if (data.audios && data.audios.length > 0) {
      uploadedAudios.push(...(await S3Service.uploadFiles(data.audios)));
    }
    if (data.videos && data.videos.length > 0) {
      uploadedVideos.push(...(await S3Service.uploadFiles(data.videos)));
    }
    if (data.images && data.images.length > 0) {
      uploadedImages.push(...(await S3Service.uploadFiles(data.images)));
    }

    // Store restricted queries in MongoDB (separate from content)
    if (data.restrictedQueries && data.restrictedQueries.length > 0) {
      try {
        // Get userId from knowledge base
        const kb = await KnowledgeBase.findById(knowledgeBaseId);
        if (kb) {
          await RestrictedQueryService.addQueries(
            knowledgeBaseId,
            kb.userId,
            data.restrictedQueries
          );
        }
      } catch (error) {
        console.error('Error storing restricted queries in MongoDB:', error);
        // Don't throw - allow other content to be processed
      }
    }

    // Prepare content attributes (excluding restricted queries - they go to MongoDB)
    const filesAttrs = KnowledgeBaseContentHelper.prepareFilesTypeAttributes(uploadedFiles);
    const urlsAttrs = KnowledgeBaseContentHelper.prepareUrlsTypeAttributes(data.urls || []);
    const textsAttrs = KnowledgeBaseContentHelper.prepareTextTypeAttributes(data.texts || []);
    const audiosAttrs = KnowledgeBaseContentHelper.prepareAudioTypeAttributes(uploadedAudios);
    const videosAttrs = KnowledgeBaseContentHelper.prepareVideoTypeAttributes(uploadedVideos);
    const imagesAttrs = KnowledgeBaseContentHelper.prepareImageTypeAttributes(uploadedImages);

    const mergedAttributes = KnowledgeBaseContentHelper.mergeAttributes(
      filesAttrs,
      urlsAttrs,
      textsAttrs,
      audiosAttrs,
      videosAttrs,
      imagesAttrs
    );

    if (mergedAttributes.length === 0) {
      return;
    }

    // Create content records
    const contents: IKnowledgeBaseContent[] = mergedAttributes.map((attr) => ({
      knowledgeBaseId,
      content: attr.content,
      textContent: attr.textContent,
      type: attr.type as any,
      status: attr.status as any || 'pending',
      depth: attr.depth,
      filename: attr.filename,
    }));

    const createdContents = await KnowledgeBaseContent.createMany(contents);

    // For text content, update content field to use the ID
    for (const content of createdContents) {
      if (content.type === 'text' && content.id) {
        await KnowledgeBaseContent.update(content.id, {
          content: content.id.toString(),
        });
      }

      // Publish SNS event for indexing
      // Include UNIQUE_ID (content's primary key id) so Lambda can identify the content item
      await SNSService.publishContentAdded(
        knowledgeBaseId,
        content.type === 'text' ? content.id!.toString() : content.content,
        content.type,
        content.depth || undefined,
        content.filename || undefined,
        content.textContent || undefined,
        content.id?.toString() || undefined // Send the primary key as UNIQUE_ID
      );
    }
  }

  /**
   * Delete content from a knowledge base
   * @param contentIds Array of content IDs (for MySQL content) or content strings (for restricted queries)
   */
  private static async deleteContent(contentIds: (number | string)[], knowledgeBaseId: number): Promise<void> {
    // Separate numeric IDs (MySQL content) from strings (restricted queries)
    const numericIds = contentIds.filter((id): id is number => typeof id === 'number');
    const stringIds = contentIds.filter((id): id is string => typeof id === 'string');

    // Fetch MySQL content by IDs
    const contents = numericIds.length > 0 ? await KnowledgeBaseContent.findByIds(numericIds) : [];

    // Filter to only delete contents that belong to this knowledge base
    const validContents = contents.filter((c) => c.knowledgeBaseId === knowledgeBaseId);

    // Get file content IDs for S3 deletion
    const fileContentIds = validContents
      .filter((c) => ['file', 'audio', 'video', 'image'].includes(c.type))
      .map((c) => c.content);

    // Delete files from S3
    if (fileContentIds.length > 0) {
      await S3Service.deleteFiles(fileContentIds);
    }

    // Handle restricted queries (from string IDs or from MySQL content)
    const restrictedQueriesToDelete: string[] = [...stringIds]; // Add string IDs (restricted queries by content)
    
    // Also check if any MySQL content is restricted_query type
    validContents.forEach((c) => {
      if (c.type === 'restricted_query' && c.content) {
        restrictedQueriesToDelete.push(c.content);
      }
    });

    // Delete restricted queries from MongoDB
    if (restrictedQueriesToDelete.length > 0) {
      try {
        const kb = await KnowledgeBase.findById(knowledgeBaseId);
        if (kb) {
          await RestrictedQueryService.removeQueries(
            knowledgeBaseId,
            kb.userId,
            restrictedQueriesToDelete
          );
        }
      } catch (error) {
        console.error('Error deleting restricted queries from MongoDB:', error);
        // Continue with regular content deletion
      }
    }

    // Filter out restricted queries from regular content
    const regularContents = validContents.filter((c) => c.type !== 'restricted_query');

    // Publish SNS events to delete content from vector storage
    // This must happen BEFORE deleting from database so we have the content data
    for (const content of regularContents) {
      // For text content, use the ID as content (matching Laravel behavior)
      // For other types, use the content field (file path, URL, etc.)
      const contentValue = content.type === 'text' && content.id 
        ? content.id.toString() 
        : content.content;

      await SNSService.publishContentDeleted(
        knowledgeBaseId,
        contentValue,
        content.type,
        content.id?.toString() || undefined // Include UNIQUE_ID for Lambda to identify the content
      );
    }

    // Delete content records from database (only regular content, not restricted queries)
    const idsToDelete = regularContents.map((c) => c.id!).filter((id): id is number => id !== undefined);
    if (idsToDelete.length > 0) {
      await KnowledgeBaseContent.deleteMany(idsToDelete);
    }
  }

  /**
   * Retry indexing a failed content item
   * Sets status back to 'pending' and republishes SNS event
   */
  static async retryContent(id: number, userId: number): Promise<IKnowledgeBaseContent | null> {
    const content = await KnowledgeBaseContent.findById(id);
    if (!content) {
      return null;
    }

    // Verify user owns the knowledge base
    const kb = await KnowledgeBase.findById(content.knowledgeBaseId);
    if (!kb || kb.userId !== userId) {
      return null;
    }

    // Only allow retry for failed content (and skip restricted queries)
    if (content.status !== 'failed') {
      throw new Error('Content is not in failed status');
    }

    if (content.type === 'restricted_query') {
      throw new Error('Cannot retry restricted queries');
    }

    // Update status to pending
    await KnowledgeBaseContent.update(id, { status: 'pending' });

    // Republish SNS event for indexing
    await SNSService.publishContentAdded(
      content.knowledgeBaseId,
      content.type === 'text' ? content.id!.toString() : content.content,
      content.type,
      content.depth || undefined,
      content.filename || undefined,
      content.textContent || undefined,
      content.id?.toString() || undefined // Send the primary key as UNIQUE_ID
    );

    // Return updated content
    return await KnowledgeBaseContent.findById(id);
  }
}

