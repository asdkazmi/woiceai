import { IKnowledgeBaseContent } from '../models/KnowledgeBase';
import { UploadedFile } from './aws/s3Service';

export interface PreparedContent {
  content: string;
  textContent?: string;
  type: string;
  status: string;
  depth?: number | null;
  filename?: string | null;
}

export class KnowledgeBaseContentHelper {
  /**
   * Prepare file type attributes
   */
  static prepareFilesTypeAttributes(files: UploadedFile[]): PreparedContent[] {
    return files.map((file) => ({
      content: file.object_id,
      type: 'file',
      status: 'pending',
      filename: file.filename,
    }));
  }

  /**
   * Prepare URL type attributes
   */
  static prepareUrlsTypeAttributes(urls: Array<string | { url: string; depth?: number }>): PreparedContent[] {
    return urls.map((url) => {
      const urlString = typeof url === 'string' ? url : url.url;
      const depth = typeof url === 'object' ? (url.depth ?? 1) : 1;
      
      return {
        content: urlString,
        type: 'url',
        status: 'pending',
        depth: depth,
      };
    });
  }

  /**
   * Prepare text type attributes
   */
  static prepareTextTypeAttributes(texts: Array<string | { text: string }>): PreparedContent[] {
    return texts.map((text) => {
      const textValue = typeof text === 'string' ? text : (text.text || '');
      
      return {
        content: textValue,
        textContent: textValue,
        type: 'text',
        status: 'pending',
      };
    });
  }

  /**
   * Prepare audio type attributes
   */
  static prepareAudioTypeAttributes(audios: UploadedFile[]): PreparedContent[] {
    return audios.map((audio) => ({
      content: audio.object_id,
      type: 'audio',
      status: 'pending',
      filename: audio.filename,
    }));
  }

  /**
   * Prepare video type attributes
   */
  static prepareVideoTypeAttributes(videos: UploadedFile[]): PreparedContent[] {
    return videos.map((video) => ({
      content: video.object_id,
      type: 'video',
      status: 'pending',
      filename: video.filename,
    }));
  }

  /**
   * Prepare image type attributes
   */
  static prepareImageTypeAttributes(images: UploadedFile[]): PreparedContent[] {
    return images.map((image) => ({
      content: image.object_id,
      type: 'image',
      status: 'pending',
      filename: image.filename,
    }));
  }

  /**
   * Merge all attribute arrays
   */
  static mergeAttributes(...attributeArrays: PreparedContent[][]): PreparedContent[] {
    const merged: PreparedContent[] = [];
    for (const attributes of attributeArrays) {
      merged.push(...attributes);
    }
    return merged.filter((attr) => attr !== null && attr !== undefined);
  }
}

