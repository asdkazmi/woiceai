import pool from '../config/database';
import { ConnectorService } from '../services/connectorService';

const defaultConnectors = [
  {
    llmName: 'qwen',
    description: 'Woice AI Qwen - Context-rich, precise, adaptable for workflows',
  },
  {
    llmName: 'openai',
    description: 'Versatile, cutting-edge, scalable language models',
  },
  {
    llmName: 'gemini',
    description: 'Natural, engaging, human-like conversational AI',
  },
  {
    llmName: 'cerebras',
    description: 'Fast, efficient, large-scale AI computations',
  },
];

export const seedConnectors = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding default connectors...');

    for (const connectorData of defaultConnectors) {
      // Check if connector already exists
      const [existing]: any = await pool.execute(
        'SELECT id FROM connectors WHERE llm_name = ?',
        [connectorData.llmName]
      );

      if (existing.length > 0) {
        console.log(`   ✓ Connector "${connectorData.llmName}" already exists`);
        continue;
      }

      // Create connector using the service (which also creates models)
      await ConnectorService.createConnector(connectorData);
      console.log(`   ✓ Created connector "${connectorData.llmName}"`);
    }

    console.log('✅ Connectors seeding completed');
  } catch (error) {
    console.error('❌ Error seeding connectors:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedConnectors()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

