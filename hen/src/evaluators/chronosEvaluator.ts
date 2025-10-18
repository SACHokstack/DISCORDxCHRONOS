import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';

/**
 * Chronos Evaluator
 * This evaluator runs early to detect document uploads and mark them for Chronos processing
 * It prevents other image analysis actions from interfering with the Chronos pipeline
 */
export const chronosEvaluator: Evaluator = {
  name: 'CHRONOS_DOCUMENT_DETECTOR',
  similes: ['DOCUMENT_UPLOAD_DETECTOR', 'CHRONOS_TRIGGER'],
  description: 'Detects document uploads and prepares them for Chronos pipeline processing',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Only validate messages with attachments
    const hasAttachments = message.content.attachments && message.content.attachments.length > 0;

    if (!hasAttachments) {
      return false;
    }

    // Check if Chronos is configured
    const chronosPath = process.env.CHRONOS_MAIN_PATH;
    const neo4jUrl = process.env.NEO4J_URL;
    const neo4jPassword = process.env.NEO4J_PASSWORD;

    if (!chronosPath || !neo4jUrl || !neo4jPassword) {
      return false;
    }

    return true;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<any> => {
    try {
      const attachment = message.content.attachments?.[0];
      if (!attachment) {
        return null;
      }

      const url = attachment.url || '';
      const isPdf = url.toLowerCase().includes('.pdf');
      const isImage = url.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp|tiff?)$/i);

      if (isPdf || isImage) {
        logger.info('📎 Document attachment detected - routing to Chronos pipeline');

        // Mark this message for Chronos processing
        return {
          chronosProcessing: true,
          attachmentType: isPdf ? 'pdf' : 'image',
          attachmentUrl: url,
          shouldProcessWithChronos: true,
          skipVisionAnalysis: true, // Signal to skip other vision processing
        };
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Error in Chronos evaluator');
      return null;
    }
  },

  examples: [
    {
      context: 'User uploads a PDF medical document',
      messages: [
        {
          name: '{{name1}}',
          content: {
            text: 'Please analyze this document',
            attachments: [
              {
                url: 'https://example.com/medical_document.pdf',
                type: 'pdf',
              },
            ],
          },
        },
      ],
      outcome: 'Evaluator detects PDF and marks for Chronos processing',
    },
  ],
};

export default chronosEvaluator;
