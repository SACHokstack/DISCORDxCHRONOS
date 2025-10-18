import { type IAgentRuntime, Service, logger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Chronos Service
 * Manages the Chronos pipeline infrastructure and monitoring
 */
export class ChronosService extends Service {
  static serviceType = 'chronos';

  capabilityDescription = `Manages medical document processing through the Chronos pipeline:
- OCR and text extraction from medical documents
- Knowledge graph generation in Neo4j
- Pattern discovery and analysis
- Hypothesis verification using FutureHouse API
- Session management for concurrent user processing`;

  private initialized = false;
  private neo4jConnected = false;
  private chronosPath: string | undefined;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<ChronosService> {
    logger.info('*** Starting Chronos service ***');
    const service = new ChronosService(runtime);
    await service.initialize();
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info('*** Stopping Chronos service ***');
    const service = runtime.getService<ChronosService>(ChronosService.serviceType);
    if (!service) {
      throw new Error('Chronos service not found');
    }
    await service.stop();
  }

  private async initialize(): Promise<void> {
    try {
      // Validate Chronos configuration
      const chronosMainPath = process.env.CHRONOS_MAIN_PATH;
      const chronosTempDir = process.env.CHRONOS_TEMP_DIR || '/tmp/chronos';
      const neo4jUrl = process.env.NEO4J_URL;
      const neo4jPassword = process.env.NEO4J_PASSWORD;

      if (!chronosMainPath) {
        logger.warn('CHRONOS_MAIN_PATH not configured - Chronos pipeline will be disabled');
        return;
      }

      if (!neo4jUrl || !neo4jPassword) {
        logger.warn('Neo4j credentials not configured - Chronos pipeline will be disabled');
        return;
      }

      // Check if main.py exists
      try {
        await fs.access(chronosMainPath);
        this.chronosPath = chronosMainPath;
        logger.info({ chronosMainPath }, 'Chronos main.py found');
      } catch (error) {
        logger.error({ chronosMainPath, error }, 'Chronos main.py not found at specified path');
        return;
      }

      // Ensure temp directory exists
      await fs.mkdir(chronosTempDir, { recursive: true });
      logger.info({ chronosTempDir }, 'Chronos temp directory ready');

      // Verify Neo4j connectivity (basic check)
      await this.checkNeo4jConnection(neo4jUrl, neo4jPassword);

      this.initialized = true;
      logger.info('✅ Chronos service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Chronos service');
      throw error;
    }
  }

  private async checkNeo4jConnection(url: string, password: string): Promise<void> {
    try {
      // Basic validation - full connection check would require neo4j-driver
      if (!url.startsWith('neo4j://') && !url.startsWith('bolt://')) {
        throw new Error('Invalid Neo4j URL format');
      }

      if (!password || password.length < 8) {
        throw new Error('Neo4j password too short or missing');
      }

      this.neo4jConnected = true;
      logger.info('Neo4j connection validated');
    } catch (error) {
      logger.error({ error }, 'Neo4j connection validation failed');
      this.neo4jConnected = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('*** Stopping Chronos service instance ***');
    this.initialized = false;
    this.neo4jConnected = false;
  }

  /**
   * Check if Chronos service is ready to process documents
   */
  isReady(): boolean {
    return this.initialized && this.neo4jConnected && !!this.chronosPath;
  }

  /**
   * Get service status for health checks
   */
  getStatus(): {
    initialized: boolean;
    neo4jConnected: boolean;
    chronosPathConfigured: boolean;
    ready: boolean;
  } {
    return {
      initialized: this.initialized,
      neo4jConnected: this.neo4jConnected,
      chronosPathConfigured: !!this.chronosPath,
      ready: this.isReady(),
    };
  }

  /**
   * Validate environment configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.CHRONOS_MAIN_PATH) {
      errors.push('CHRONOS_MAIN_PATH is not configured');
    }

    if (!process.env.NEO4J_URL) {
      errors.push('NEO4J_URL is not configured');
    }

    if (!process.env.NEO4J_PASSWORD) {
      errors.push('NEO4J_PASSWORD is not configured');
    }

    if (!process.env.NEO4J_USERNAME) {
      errors.push('NEO4J_USERNAME is not configured (defaults to "neo4j")');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ChronosService;
