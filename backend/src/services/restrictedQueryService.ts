import { ObjectId, Collection } from 'mongodb';
import { getMongoDB } from './mongodbService';

export interface RestrictedQueryDocument {
  _id?: ObjectId | string;
  kbId: number;
  userId: number;
  restricted_queries: string[];
  created_at?: Date;
  updated_at?: Date;
}

export class RestrictedQueryService {
  private static getCollection(): Collection<RestrictedQueryDocument> {
    const db = getMongoDB();
    return db.collection<RestrictedQueryDocument>('restricted-queries');
  }

  /**
   * Get restricted queries for a knowledge base
   */
  static async getByKnowledgeBaseId(kbId: number, userId: number): Promise<RestrictedQueryDocument | null> {
    try {
      const collection = this.getCollection();
      const document = await collection.findOne({ kbId, userId });
      
      if (!document) {
        return null;
      }

      return {
        _id: document._id?.toString(),
        kbId: document.kbId,
        userId: document.userId,
        restricted_queries: document.restricted_queries || [],
        created_at: document.created_at,
        updated_at: document.updated_at,
      };
    } catch (error) {
      console.error('Error fetching restricted queries from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get all restricted queries for a user
   */
  static async getAllByUserId(userId: number): Promise<RestrictedQueryDocument[]> {
    try {
      const collection = this.getCollection();
      const documents = await collection.find({ userId }).toArray();
      
      return documents.map(doc => ({
        _id: doc._id?.toString(),
        kbId: doc.kbId,
        userId: doc.userId,
        restricted_queries: doc.restricted_queries || [],
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching restricted queries from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Store or update restricted queries for a knowledge base
   * If a document exists, it updates it; otherwise creates a new one
   */
  static async storeOrUpdate(
    kbId: number,
    userId: number,
    queries: string[]
  ): Promise<RestrictedQueryDocument> {
    try {
      const collection = this.getCollection();
      
      // Clean and validate queries
      const cleanQueries = queries
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .filter((q, index, self) => self.indexOf(q) === index); // Remove duplicates

      const now = new Date();

      // Try to find existing document
      const existing = await collection.findOne({ kbId, userId });

      if (existing) {
        // Update existing document
        const result = await collection.findOneAndUpdate(
          { kbId, userId },
          {
            $set: {
              restricted_queries: cleanQueries,
              updated_at: now,
            },
          },
          { returnDocument: 'after' }
        );

        if (!result) {
          throw new Error('Failed to update restricted queries');
        }

        return {
          _id: result._id?.toString(),
          kbId: result.kbId,
          userId: result.userId,
          restricted_queries: result.restricted_queries || [],
          created_at: result.created_at,
          updated_at: result.updated_at,
        };
      } else {
        // Create new document
        const newDocument: RestrictedQueryDocument = {
          kbId,
          userId,
          restricted_queries: cleanQueries,
          created_at: now,
          updated_at: now,
        };

        const result = await collection.insertOne(newDocument as any);

        return {
          _id: result.insertedId.toString(),
          kbId: newDocument.kbId,
          userId: newDocument.userId,
          restricted_queries: newDocument.restricted_queries,
          created_at: newDocument.created_at,
          updated_at: newDocument.updated_at,
        };
      }
    } catch (error) {
      console.error('Error storing restricted queries in MongoDB:', error);
      throw error;
    }
  }

  /**
   * Add new restricted queries to existing document (merge with existing)
   */
  static async addQueries(
    kbId: number,
    userId: number,
    newQueries: string[]
  ): Promise<RestrictedQueryDocument> {
    try {
      const collection = this.getCollection();
      
      // Clean and validate new queries
      const cleanNewQueries = newQueries
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const existing = await this.getByKnowledgeBaseId(kbId, userId);

      if (existing) {
        // Merge with existing queries and remove duplicates
        const mergedQueries = [
          ...existing.restricted_queries,
          ...cleanNewQueries,
        ].filter((q, index, self) => self.indexOf(q) === index);

        return await this.storeOrUpdate(kbId, userId, mergedQueries);
      } else {
        // Create new document
        return await this.storeOrUpdate(kbId, userId, cleanNewQueries);
      }
    } catch (error) {
      console.error('Error adding restricted queries:', error);
      throw error;
    }
  }

  /**
   * Delete restricted queries document for a knowledge base
   */
  static async delete(kbId: number, userId: number): Promise<boolean> {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ kbId, userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting restricted queries from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Delete specific queries from a knowledge base
   */
  static async removeQueries(
    kbId: number,
    userId: number,
    queriesToRemove: string[]
  ): Promise<RestrictedQueryDocument | null> {
    try {
      const existing = await this.getByKnowledgeBaseId(kbId, userId);

      if (!existing) {
        return null;
      }

      // Remove specified queries
      const remainingQueries = existing.restricted_queries.filter(
        q => !queriesToRemove.includes(q)
      );

      if (remainingQueries.length === 0) {
        // If no queries left, delete the document
        await this.delete(kbId, userId);
        return null;
      }

      // Update with remaining queries
      return await this.storeOrUpdate(kbId, userId, remainingQueries);
    } catch (error) {
      console.error('Error removing restricted queries:', error);
      throw error;
    }
  }
}

