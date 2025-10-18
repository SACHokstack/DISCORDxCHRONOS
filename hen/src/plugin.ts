import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';
import { chronosAction } from './actions/chronosAction';
import { ChronosService } from './services/chronosService';
import { chronosEvaluator } from './evaluators/chronosEvaluator';

/**
 * Define the configuration schema for the plugin with the following properties:
 *
 * @param {string} EXAMPLE_PLUGIN_VARIABLE - The name of the plugin (min length of 1, optional)
 * @returns {object} - The configured schema object
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: Example plugin variable is not provided');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Represents an action that responds with a simple hello world message.
 *
 * @typedef {Object} Action
 * @property {string} name - The name of the action
 * @property {string[]} similes - The related similes of the action
 * @property {string} description - Description of the action
 * @property {Function} validate - Validation function for the action
 * @property {Function} handler - The function that handles the action
 * @property {Object[]} examples - Array of examples for the action
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling HELLO_WORLD action');

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      return {
        text: 'Sent hello world greeting',
        values: {
          success: true,
          greeted: true,
        },
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
          timestamp: Date.now(),
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error in HELLO_WORLD action:');

      return {
        text: 'Failed to send hello world greeting',
        values: {
          success: false,
          error: 'GREETING_FAILED',
        },
        data: {
          actionName: 'HELLO_WORLD',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting starter service ***');
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping starter service ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping starter service instance ***');
  }
}

const plugin: Plugin = {
  name: 'starter',
  description: 'A starter plugin for Eliza with Chronos medical document processing',
  // Set high priority so Chronos action runs before Bootstrap vision analysis
  priority: 1000,
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing starter plugin ***');
    logger.info('🔬 CHRONOS PLUGIN PRIORITY: 1000 (HIGH)');
    logger.info(`🎯 Registering ${this.actions?.length || 0} actions`);
    logger.info(`📊 Registering ${this.evaluators?.length || 0} evaluators`);
    logger.info(`⚙️ Registering ${this.services?.length || 0} services`);

    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }

      // Validate Chronos configuration
      const chronosValidation = ChronosService.validateConfig();
      if (!chronosValidation.valid) {
        logger.warn('Chronos configuration incomplete - some features may be disabled');
        chronosValidation.errors.forEach(error => logger.warn(error));
      } else {
        logger.info('✅ Chronos configuration validated');
        logger.info(`   CHRONOS_MAIN_PATH: ${process.env.CHRONOS_MAIN_PATH}`);
        logger.info(`   NEO4J_URL: ${process.env.NEO4J_URL}`);
      }

      // Log registered actions
      if (this.actions) {
        logger.info('📋 Registered Actions:');
        this.actions.forEach((action: any) => {
          logger.info(`   - ${action.name}`);
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  routes: [
    {
      name: 'helloworld',
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
    {
      name: 'chronos-status',
      path: '/chronos/status',
      type: 'GET',
      handler: async (req: any, res: any) => {
        const runtime = req.runtime;
        const service = runtime?.getService<ChronosService>(ChronosService.serviceType);

        if (!service) {
          res.status(503).json({
            status: 'unavailable',
            message: 'Chronos service not running',
          });
          return;
        }

        res.json({
          status: 'ok',
          ...service.getStatus(),
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        // Intercept messages with attachments for Chronos processing
        const { message, runtime, callback } = params as any;

        // Check for ORIGINAL Discord attachments (before Bootstrap processes them)
        const hasOriginalAttachments = message?.content?.attachments?.some((att: any) => {
          const url = att.url || '';
          return url.includes('cdn.discordapp.com') &&
                 (url.match(/\.(png|jpg|jpeg|gif|pdf|webp|bmp|tiff?)(\?|$)/i) !== null);
        });

        if (hasOriginalAttachments) {
          logger.info('🖼️ ORIGINAL Discord media attachment detected - intercepting BEFORE Bootstrap');

          const attachment = message.content.attachments.find((att: any) => {
            const url = att.url || '';
            return url.includes('cdn.discordapp.com');
          });

          if (attachment) {
            logger.info(`📎 Processing original attachment: ${attachment.url}`);

            try {
              // Directly trigger Chronos action with the ORIGINAL attachment
              const result = await chronosAction.handler(
                runtime,
                message,
                {} as any,
                {},
                callback,
                []
              );

              if (result.success) {
                logger.info('✅ Chronos action triggered successfully - bypassing Bootstrap vision analysis');
                return; // Stop further processing ONLY for image attachments
              }
            } catch (error) {
              logger.error({ error }, 'Error triggering Chronos action from event handler');
            }
          }
        }

        // For text messages: handle with simple LLM chat completion
        if (!hasOriginalAttachments && message?.content?.text?.trim()) {
          logger.info('💬 Text message received - generating response');

          try {
            const userMessage = message.content.text.trim();

            // Get recent conversation context (last 10 messages)
            const recentMessages = await runtime.messageManager.getMemories({
              roomId: message.roomId,
              count: 10,
              unique: false,
            });

            // Build conversation history
            const conversationHistory = recentMessages
              .reverse()
              .map((mem: any) => ({
                role: mem.userId === runtime.agentId ? 'assistant' : 'user',
                content: mem.content.text || '',
              }))
              .filter((msg: any) => msg.content.length > 0);

            // Add current message
            conversationHistory.push({
              role: 'user',
              content: userMessage,
            });

            // Generate response using runtime's completion
            const response = await runtime.completion({
              messages: [
                {
                  role: 'system',
                  content: `You are Eliza, a helpful AI assistant. You are friendly, concise, and conversational.
You provide assistance on a wide range of topics with clear, direct responses.
You can also process medical document images through an advanced Chronos pipeline for deep analysis.
Keep responses natural and engaging.`,
                },
                ...conversationHistory,
              ],
              temperature: 0.7,
              maxTokens: 500,
            });

            // Send response back
            await callback({
              text: response,
              source: message.content.source,
            });

            logger.info('✅ Text response sent successfully');
            return; // Stop further processing

          } catch (error) {
            logger.error({ error }, 'Error generating text response');
            // Fallback response
            await callback({
              text: "Hello! I'm here to help. What can I do for you?",
              source: message.content.source,
            });
          }
        }
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'VOICE_MESSAGE_RECEIVED param keys');
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.info('WORLD_CONNECTED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_CONNECTED param keys');
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.info('WORLD_JOINED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_JOINED param keys');
      },
    ],
  },
  services: [StarterService, ChronosService],
  actions: [chronosAction, helloWorldAction], // Chronos action first for priority
  evaluators: [chronosEvaluator],
  providers: [helloWorldProvider],
};

export default plugin;
