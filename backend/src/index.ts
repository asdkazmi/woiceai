import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/googleAuth';
import authRoutes from './routes/auth';
import knowledgeBaseRoutes from './routes/knowledgeBase';
import connectorRoutes from './routes/connector';
import webhookRoutes from './routes/webhook';
import chatAIRoutes from './routes/chatAI';
import urlTreeRoutes from './routes/urlTree';
import { createDatabaseIfNotExists, testConnection } from './config/database';
import { createUsersTable } from './migrations/createUsersTable';
import { createKnowledgeBasesTable } from './migrations/createKnowledgeBasesTable';
import { createKnowledgeBaseContentsTable } from './migrations/createKnowledgeBaseContentsTable';
import { addContentExplanationsToKnowledgeBaseContentsTable } from './migrations/addContentExplanationsToKnowledgeBaseContentsTable';
import { createConnectorsTable } from './migrations/createConnectorsTable';
import { createConnectorModelsTable } from './migrations/createConnectorModelsTable';
import { createConnectorUserTable } from './migrations/createConnectorUserTable';
import { createUserConnectorModelsTable } from './migrations/createUserConnectorModelsTable';
import { createChatAisTable } from './migrations/createChatAisTable';
import { createChatAiMessagesTable } from './migrations/createChatAiMessagesTable';
import { addIsPublishedToChatAisTable } from './migrations/addIsPublishedToChatAisTable';
import { addTreeDocumentIdToKnowledgeBaseContentsTable } from './migrations/addTreeDocumentIdToKnowledgeBaseContentsTable';
import { seedConnectors } from './scripts/seedConnectors';
import { connectMongoDB } from './services/mongodbService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow all origins in development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      callback(null, true);
    } else {
      // In production, check against allowed origins
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
};

// Middleware - CORS must be before other middleware
app.use(cors(corsOptions));

// Body parsing middleware - handle both JSON and text/plain (SNS sends as text/plain)
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain', limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to parse SNS webhook body (SNS sends JSON as text/plain)
// This must be before routes are registered
app.use((req, res, next) => {
  // Only process SNS webhook routes
  if (req.path.includes('/webhook') || req.path.includes('/sns')) {
    if (req.headers['content-type']?.includes('text/plain') && typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
        console.log('Parsed SNS webhook body from text/plain');
      } catch (e) {
        // If parsing fails, continue with original body
        console.warn('Failed to parse SNS webhook body as JSON:', e);
      }
    }
  }
  next();
});

// Session configuration for Passport (minimal, since we use JWT)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Database initialization
const initializeDatabase = async (): Promise<void> => {
  try {
    await createDatabaseIfNotExists();
    await testConnection();
    await createUsersTable();
    await createKnowledgeBasesTable();
    await createKnowledgeBaseContentsTable();
    await addContentExplanationsToKnowledgeBaseContentsTable();
    await createConnectorsTable();
    await createConnectorModelsTable();
    await createConnectorUserTable();
    await createUserConnectorModelsTable();
    await createChatAisTable();
    await createChatAiMessagesTable();
    await addIsPublishedToChatAisTable();
    await addTreeDocumentIdToKnowledgeBaseContentsTable();
    // Seed default connectors
    await seedConnectors();
    
    // Initialize MongoDB connection (optional - only if MONGODB_URI is set)
    if (process.env.MONGODB_URI) {
      try {
        await connectMongoDB();
      } catch (error) {
        console.warn('⚠️ MongoDB connection failed (optional):', error);
        console.warn('⚠️ URL tree feature will not be available');
      }
    } else {
      console.log('ℹ️ MongoDB URI not configured - URL tree feature disabled');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    // Don't exit in development - allow retry
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ Exiting due to database initialization failure in production');
      process.exit(1);
    } else {
      console.warn('⚠️ Database initialization failed, but continuing in development mode');
      throw error; // Re-throw to be caught by caller
    }
  }
};

// Initialize database on startup
initializeDatabase().catch((error) => {
  console.error('❌ Failed to initialize database:', error);
  // Don't exit immediately - let the server start and retry
  setTimeout(() => {
    console.log('🔄 Retrying database initialization...');
    initializeDatabase();
  }, 5000);
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately - log and let the server continue
  // In production, you might want to exit here, but in dev we'll continue
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️ Exiting due to uncaught exception in production');
    process.exit(1);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/chat-ai', chatAIRoutes);
app.use('/api/url-tree', urlTreeRoutes);
// Webhook routes - match Laravel pattern for SNS subscription
app.use('/knowledgebase', webhookRoutes);
app.use('/api/webhook', webhookRoutes); // Also keep API version for flexibility

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

