import {
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface ChronosProcessingState {
  userId: string;
  imageUrl: string;
  startTime: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  sessionId: string;
  tempImagePath?: string;
  resultsPath?: string;
}

// In-memory session management for concurrent users
const activeSessions = new Map<string, ChronosProcessingState>();

/**
 * Chronos Pipeline Action
 * Processes medical document images through the full Chronos pipeline:
 * OCR → Knowledge Graph (Neo4j) → Pattern Discovery → Hypothesis Verification (FutureHouse API)
 */
export const chronosAction: Action = {
  name: 'PROCESS_CHRONOS_IMAGE',
  similes: [
    'ANALYZE_MEDICAL_DOCUMENT',
    'PROCESS_MEDICAL_IMAGE',
    'RUN_CHRONOS',
    'PROCESS_DOCUMENT',
    'ANALYZE_DOCUMENT'
  ],
  description:
    'Processes a medical document image through the Chronos pipeline (OCR, Knowledge Graph, Pattern Discovery, Hypothesis Verification)',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    logger.info('🔍 CHRONOS ACTION VALIDATE CALLED');
    logger.info(`Message content: ${JSON.stringify(message.content)}`);

    // Check if message contains an image attachment
    const hasImage = message.content.attachments && message.content.attachments.length > 0;

    if (!hasImage) {
      logger.info('❌ No attachments found, skipping Chronos action');
      return false;
    }

    logger.info(`✅ Found ${message.content.attachments.length} attachments`);

    // Check if Chronos environment is configured
    const chronosPath = process.env.CHRONOS_MAIN_PATH;
    const neo4jUrl = process.env.NEO4J_URL;
    const neo4jPassword = process.env.NEO4J_PASSWORD;

    if (!chronosPath || !neo4jUrl || !neo4jPassword) {
      logger.warn('Chronos environment variables not configured, skipping Chronos action');
      return false;
    }

    // Check if attachment is a document type (PDF, PNG, JPG)
    const attachment = message.content.attachments[0];
    const url = attachment.url || '';
    const isPdf = url.toLowerCase().includes('.pdf');
    const isImage = url.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp|tiff?)$/i);

    if (isPdf || isImage) {
      logger.info('Document/image attachment detected, validating for Chronos processing');
      return true;
    }

    logger.debug('Attachment is not a document/image type, skipping Chronos action');
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
    responses: Memory[]
  ): Promise<ActionResult> => {
    const sessionId = `chronos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = message.userId;

    try {
      logger.info('🔬 Chronos Action Handler Triggered');
      logger.info(`Starting Chronos pipeline for user ${userId}, session ${sessionId}`);
      logger.info(`Message attachments: ${JSON.stringify(message.content.attachments)}`);

      // Extract image URL from attachments
      const imageAttachment = message.content.attachments?.[0];
      if (!imageAttachment?.url) {
        throw new Error('No image URL found in attachments');
      }

      // Initialize session state
      const sessionState: ChronosProcessingState = {
        userId,
        imageUrl: imageAttachment.url,
        startTime: Date.now(),
        status: 'queued',
        sessionId,
      };
      activeSessions.set(sessionId, sessionState);

      // Notify user that processing has started
      await callback({
        text: `🔬 Chronos Pipeline Started\n\nYour medical document is being processed. This will take approximately 25-30 minutes.\n\nPipeline stages:\n1. ✅ OCR & Text Extraction\n2. ⏳ Knowledge Graph Generation\n3. ⏳ Pattern Discovery\n4. ⏳ Hypothesis Verification\n\nSession ID: ${sessionId}\n\nYou can continue using the bot while processing runs in the background. You'll receive results when complete.`,
        actions: ['PROCESS_CHRONOS_IMAGE'],
        source: message.content.source,
      });

      // Start processing in background (non-blocking)
      processChronosInBackground(sessionId, imageAttachment.url, userId, callback, runtime);

      return {
        text: 'Chronos pipeline started successfully',
        values: {
          success: true,
          sessionId,
          estimatedTime: '25-30 minutes',
        },
        data: {
          actionName: 'PROCESS_CHRONOS_IMAGE',
          sessionId,
          status: 'queued',
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error, sessionId }, 'Error starting Chronos pipeline');

      activeSessions.delete(sessionId);

      await callback({
        text: '❌ Failed to start Chronos pipeline. Please check the logs and try again.',
        actions: ['PROCESS_CHRONOS_IMAGE'],
        source: message.content.source,
      });

      return {
        text: 'Failed to start Chronos pipeline',
        values: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        data: {
          actionName: 'PROCESS_CHRONOS_IMAGE',
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
          text: 'Please analyze this medical document',
          attachments: [
            {
              url: 'https://example.com/medical-document.pdf',
              type: 'image',
            },
          ],
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🔬 Chronos Pipeline Started\n\nYour medical document is being processed...',
          actions: ['PROCESS_CHRONOS_IMAGE'],
        },
      },
    ],
  ],
};

/**
 * Background processing function that runs the Chronos pipeline
 * This runs asynchronously without blocking the main bot interaction
 */
async function processChronosInBackground(
  sessionId: string,
  imageUrl: string,
  userId: string,
  callback: HandlerCallback,
  runtime: IAgentRuntime
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    logger.error({ sessionId }, 'Session not found for background processing');
    return;
  }

  try {
    session.status = 'processing';
    logger.info({ sessionId, userId }, 'Chronos background processing started');

    // Get configuration from environment
    // discord_main.py and venv are in the hen folder (bot root)
    const henDir = process.cwd(); // Current working directory is the hen folder
    const discordMainPath = path.join(henDir, 'discord_main.py');
    const chronosTempDir = process.env.CHRONOS_TEMP_DIR || '/tmp/chronos';

    logger.info({ henDir, discordMainPath }, 'Chronos paths resolved');

    // Create temp directory for this session
    const sessionTempDir = path.join(chronosTempDir, sessionId);
    await fs.mkdir(sessionTempDir, { recursive: true });

    // Download image to temp location
    const imageExtension = path.extname(new URL(imageUrl).pathname) || '.pdf';
    const tempImagePath = path.join(sessionTempDir, `input${imageExtension}`);

    logger.info({ sessionId, imageUrl, tempImagePath }, 'Downloading image');
    await downloadImage(imageUrl, tempImagePath);
    session.tempImagePath = tempImagePath;

    // Send progress update
    await callback({
      text: `📊 Processing Update - Session ${sessionId}\n\nStage 1/4: OCR in progress...\nEstimated time remaining: ~20-25 minutes`,
    });

    // Execute Discord wrapper script using venv Python
    const venvPython = path.join(henDir, 'venv', 'bin', 'python3');
    logger.info({ sessionId, discordMainPath, tempImagePath, venvPython }, 'Executing Chronos Discord wrapper');
    const { stdout, stderr } = await execAsync(
      `"${venvPython}" "${discordMainPath}" "${tempImagePath}" "${userId}" "${sessionId}"`,
      {
        cwd: henDir,
        timeout: 1800000, // 30 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    logger.info({ sessionId, stdoutLength: stdout.length, stderrLength: stderr.length }, 'Pipeline execution completed');

    // Parse Discord-formatted results from stdout
    const hypothesisResults = parseDiscordResults(stdout);
    session.status = 'completed';

    // Send final results to user
    const resultsText = formatHypothesisResults(hypothesisResults);
    await callback({
      text: `✅ Chronos Pipeline Complete - Session ${sessionId}\n\nProcessing time: ${Math.round((Date.now() - session.startTime) / 1000 / 60)} minutes\n\n${resultsText}`,
    });

    logger.info({ sessionId, resultsCount: hypothesisResults.length }, 'Chronos pipeline completed successfully');

    // Clean up after 1 hour
    setTimeout(async () => {
      try {
        await fs.rm(sessionTempDir, { recursive: true, force: true });
        activeSessions.delete(sessionId);
        logger.info({ sessionId }, 'Session cleaned up');
      } catch (error) {
        logger.error({ error, sessionId }, 'Error cleaning up session');
      }
    }, 3600000); // 1 hour

  } catch (error) {
    logger.error({ error, sessionId }, 'Chronos pipeline failed');
    session.status = 'failed';

    await callback({
      text: `❌ Chronos Pipeline Failed - Session ${sessionId}\n\nAn error occurred during processing. Please check the logs for details.\n\nError: ${error instanceof Error ? error.message : String(error)}`,
    });

    // Clean up on failure
    if (session.tempImagePath) {
      try {
        const sessionDir = path.dirname(session.tempImagePath);
        await fs.rm(sessionDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.error({ cleanupError, sessionId }, 'Error cleaning up failed session');
      }
    }
    activeSessions.delete(sessionId);
  }
}

/**
 * Downloads an image from a URL to a local file path
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

/**
 * Parse Discord-formatted results from Python stdout
 */
function parseDiscordResults(stdout: string): any[] {
  try {
    const results: any[] = [];
    const startMarker = 'DISCORD_RESULTS_START';
    const endMarker = 'DISCORD_RESULTS_END';

    const startIdx = stdout.indexOf(startMarker);
    const endIdx = stdout.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      logger.warn('Discord results markers not found in output');
      return [];
    }

    const resultsSection = stdout.substring(startIdx + startMarker.length, endIdx);
    const lines = resultsSection.split('\n').map(l => l.trim()).filter(l => l);

    let currentResult: any = {};
    let questionNum = 0;

    for (const line of lines) {
      if (line === '---') {
        if (currentResult.question) {
          results.push(currentResult);
          currentResult = {};
        }
        continue;
      }

      if (line.startsWith('Q')) {
        const [, question] = line.split(':::');
        questionNum = parseInt(line.match(/Q(\d+)/)?.[1] || '0');
        currentResult.question = question;
      } else if (line.startsWith('A')) {
        const [, answer] = line.split(':::');
        currentResult.owl_answer = answer;
        currentResult.answer = answer;
      } else if (line.startsWith('C')) {
        const [, confidence] = line.split(':::');
        currentResult.confidence = confidence;
      } else if (line.startsWith('ERROR:::')) {
        const error = line.substring(8);
        logger.error({ error }, 'Python pipeline reported error');
        return [];
      }
    }

    // Push last result if exists
    if (currentResult.question) {
      results.push(currentResult);
    }

    return results;
  } catch (error) {
    logger.error({ error }, 'Error parsing Discord results');
    return [];
  }
}

/**
 * Formats hypothesis results for user-friendly display
 */
function formatHypothesisResults(results: any[]): string {
  if (results.length === 0) {
    return '⚠️ No hypothesis results generated. The document may not have contained sufficient data for analysis.';
  }

  let formatted = `📋 Hypothesis Verification Results (${results.length} total)\n\n`;

  results.slice(0, 5).forEach((result, index) => {
    const question = result.question || result.hypothesis || 'Unknown';
    const answer = result.answer || result.result || 'No answer provided';
    const confidence = result.confidence || result.score || 'N/A';

    formatted += `${index + 1}. **Question**: ${question}\n`;
    formatted += `   **Answer**: ${answer}\n`;
    formatted += `   **Confidence**: ${confidence}\n\n`;
  });

  if (results.length > 5) {
    formatted += `\n... and ${results.length - 5} more results\n`;
  }

  return formatted;
}

/**
 * Get status of an active session
 */
export function getChronosSessionStatus(sessionId: string): ChronosProcessingState | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get all active sessions for a user
 */
export function getUserChronosSessions(userId: string): ChronosProcessingState[] {
  return Array.from(activeSessions.values()).filter(session => session.userId === userId);
}
