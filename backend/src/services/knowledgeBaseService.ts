import { IKnowledgeBase, IKnowledgeBaseContent, KnowledgeBase, KnowledgeBaseContent, IKnowledgeBaseWithContents, IKnowledgeBaseContentStats } from '../models/KnowledgeBase';
import { S3Service, UploadedFile } from './aws/s3Service';
import { SNSService } from './aws/snsService';
import { KnowledgeBaseContentHelper, PreparedContent } from './knowledgeBaseContentHelper';

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
  deleteIds?: number[];
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

    // Generate presigned URLs for file content types
    if (kb.knowledgeBaseContents && kb.knowledgeBaseContents.length > 0) {
      const contentsWithUrls = await Promise.all(
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

      return { ...kb, knowledgeBaseContents: contentsWithUrls } as IKnowledgeBaseWithContents;
    }

    return kb as IKnowledgeBaseWithContents;
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
    if (data.files || data.urls || data.texts || data.audios || data.videos || data.images) {
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
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const kb = await KnowledgeBase.findById(id);
    if (!kb || kb.userId !== userId) {
      return false;
    }

    // Check if any content is in progress
    const inProgressCount = await KnowledgeBaseContent.countInProgress(id);
    if (inProgressCount > 0) {
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

    // Publish delete event to SNS
    await SNSService.publishKnowledgeBaseDeleted(id);

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

    // Prepare content attributes
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
      status: 'pending',
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
   */
  private static async deleteContent(contentIds: number[], knowledgeBaseId: number): Promise<void> {
    const contents = await KnowledgeBaseContent.findByIds(contentIds);

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

    // Publish SNS events to delete content from vector storage
    // This must happen BEFORE deleting from database so we have the content data
    for (const content of validContents) {
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

    // Delete content records from database
    const idsToDelete = validContents.map((c) => c.id!);
    await KnowledgeBaseContent.deleteMany(idsToDelete);
  }
}

