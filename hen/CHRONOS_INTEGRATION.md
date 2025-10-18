# Chronos Pipeline Integration

## Overview

This Eliza bot integrates the **Chronos medical document processing pipeline** to provide automated analysis of medical documents through Discord and Telegram. When users upload medical document images, the bot processes them through a comprehensive pipeline that includes OCR, knowledge graph generation, pattern discovery, and hypothesis verification.

## Pipeline Stages

The Chronos pipeline consists of four main stages:

```
1. OCR & Text Extraction
   └─> Extracts text from historical/medical PDFs and images

2. Knowledge Graph Generation
   └─> Creates structured knowledge graphs in Neo4j

3. Pattern Discovery
   └─> Identifies patterns and relationships in the data

4. Hypothesis Verification
   └─> Verifies hypotheses using FutureHouse API
```

**Processing Time**: ~25-30 minutes per document

## Features

- ✅ **Concurrent User Support**: Multiple users can upload documents simultaneously without conflicts
- ✅ **Background Processing**: Processing runs asynchronously - users can continue interacting with the bot
- ✅ **Session Management**: Each upload gets a unique session ID for tracking
- ✅ **Result Filtering**: Only hypothesis verification results are returned to users
- ✅ **Progress Updates**: Users receive periodic updates during processing
- ✅ **Terminal Logging**: All pipeline steps are logged for monitoring
- ✅ **Auto Cleanup**: Temporary files are cleaned up automatically after 1 hour

## Setup Instructions

### Prerequisites

1. **Neo4j Database** (required)
   - Install and run Neo4j locally or use a cloud instance
   - Default URL: `neo4j://127.0.0.1:7687`
   - You'll need the password for configuration

2. **Python Environment** (required)
   - Python 3.8+ with Chronos dependencies installed
   - The HeritageNet-example pipeline must be set up and working

3. **FutureHouse API Key** (required for hypothesis verification)
   - Configure in the HeritageNet-example/.env file

### Step 1: Configure Environment Variables

Copy `.env.example` to `.env` and add the following Chronos configuration:

```bash
# Chronos Pipeline Configuration
CHRONOS_MAIN_PATH=/home/sach/ELIZAOS!/Discord_working_chronos/hen/HeritageNet-example/app/main.py
CHRONOS_TEMP_DIR=/tmp/chronos
NEO4J_URL=neo4j://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password-here
```

### Step 2: Install Dependencies

```bash
# Install Eliza dependencies
bun install

# Ensure Python dependencies are installed for Chronos
cd HeritageNet-example
pip install -r requirements.txt
```

### Step 3: Start Neo4j

```bash
# If using Docker
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest

# Or start your local Neo4j installation
# Check Neo4j browser at http://localhost:7474
```

### Step 4: Configure Communication Platforms

#### For Discord:

```bash
DISCORD_APPLICATION_ID=your-discord-app-id
DISCORD_API_TOKEN=your-discord-bot-token
```

Add the Discord plugin to your character:

```typescript
// src/character.ts
plugins: [
  '@elizaos/plugin-discord',
  // ... other plugins
]
```

#### For Telegram:

```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

Add the Telegram plugin to your character:

```typescript
// src/character.ts
plugins: [
  '@elizaos/plugin-telegram',
  // ... other plugins
]
```

### Step 5: Start the Bot

```bash
# Development mode with hot reload
elizaos dev

# Production mode
elizaos start
```

## Usage

### For Users (Discord/Telegram)

1. **Upload a medical document image** (PDF, PNG, JPG)
2. **Receive confirmation** with session ID and estimated processing time
3. **Continue using the bot** while processing runs in background
4. **Receive results** when processing completes (~25-30 minutes)

### Example Interaction

```
User: [uploads medical_document.pdf]

Bot: 🔬 Chronos Pipeline Started

Your medical document is being processed. This will take approximately 25-30 minutes.

Pipeline stages:
1. ✅ OCR & Text Extraction
2. ⏳ Knowledge Graph Generation
3. ⏳ Pattern Discovery
4. ⏳ Hypothesis Verification

Session ID: chronos_1234567890_abc123

You can continue using the bot while processing runs in the background.
You'll receive results when complete.

[~10 minutes later]
Bot: 📊 Processing Update - Session chronos_1234567890_abc123

Stage 1/4: OCR in progress...
Estimated time remaining: ~20-25 minutes

[~25 minutes later]
Bot: ✅ Chronos Pipeline Complete - Session chronos_1234567890_abc123

Processing time: 25 minutes

📋 Hypothesis Verification Results (5 total)

1. **Question**: What is the relationship between posture type A and skeletal structure?
   **Answer**: Posture type A shows correlation with specific skeletal features...
   **Confidence**: 0.87

2. **Question**: How does posture affect overall health outcomes?
   **Answer**: The document suggests multiple correlations between posture...
   **Confidence**: 0.92

[... more results ...]
```

## Monitoring & Debugging

### Check Service Status

```bash
# Via HTTP endpoint
curl http://localhost:3000/chronos/status

# Response:
{
  "status": "ok",
  "initialized": true,
  "neo4jConnected": true,
  "chronosPathConfigured": true,
  "ready": true
}
```

### View Logs

The bot logs all pipeline operations to the terminal:

```bash
# Start with debug logging
LOG_LEVEL=debug elizaos start

# Watch for Chronos-specific logs
elizaos start 2>&1 | grep -i chronos
```

### Common Issues

#### Issue: "Chronos service not running"
**Solution**: Check that all environment variables are set correctly:
```bash
echo $CHRONOS_MAIN_PATH
echo $NEO4J_URL
echo $NEO4J_PASSWORD
```

#### Issue: "Neo4j connection failed"
**Solution**:
1. Verify Neo4j is running: `docker ps` or check http://localhost:7474
2. Test connection with correct credentials
3. Check firewall/network settings

#### Issue: "Pipeline timeout"
**Solution**:
1. Large documents may take longer than 30 minutes
2. Increase timeout in `chronosAction.ts` if needed:
```typescript
timeout: 3600000, // 60 minutes instead of 30
```

#### Issue: "No hypothesis results generated"
**Solution**:
1. Check FutureHouse API key is configured in HeritageNet-example/.env
2. Verify document contains sufficient data for analysis
3. Check Python script logs for errors

### File Locations

- **Temporary files**: `/tmp/chronos/<session-id>/`
- **Results**: `/tmp/chronos/<session-id>/hypothesis_results/`
- **Logs**: Terminal output when running `elizaos start`

Files are automatically cleaned up 1 hour after processing completes.

## Architecture

### Components

1. **ChronosAction** (`src/actions/chronosAction.ts`)
   - Validates image attachments
   - Manages background processing
   - Handles user communication
   - Formats and returns results

2. **ChronosService** (`src/services/chronosService.ts`)
   - Validates configuration
   - Manages Neo4j connectivity
   - Provides health checks
   - Service lifecycle management

3. **Plugin Integration** (`src/plugin.ts`)
   - Registers action and service
   - Provides HTTP status endpoint
   - Validates configuration on startup

4. **Character Configuration** (`src/character.ts`)
   - Defines bot personality
   - Documents Chronos capabilities
   - Configures platform plugins

### Data Flow

```
User Upload (Discord/Telegram)
      ↓
Eliza Bot (validates image)
      ↓
ChronosAction (creates session)
      ↓
Background Process (Python script)
      ↓
├─> OCR Extraction
├─> Knowledge Graph (Neo4j)
├─> Pattern Discovery
└─> Hypothesis Verification (FutureHouse)
      ↓
Results Formatting
      ↓
User Notification (Discord/Telegram)
```

### Session Management

Sessions are stored in-memory with the following structure:

```typescript
interface ChronosProcessingState {
  userId: string;           // User who initiated
  imageUrl: string;         // Source image URL
  startTime: number;        // Timestamp
  status: 'queued' | 'processing' | 'completed' | 'failed';
  sessionId: string;        // Unique identifier
  tempImagePath?: string;   // Local temp file
  resultsPath?: string;     // Results directory
}
```

Multiple users can have concurrent sessions without interference.

## Development

### Adding New Features

#### Custom Result Formatting

Edit `formatHypothesisResults()` in `src/actions/chronosAction.ts`:

```typescript
function formatHypothesisResults(results: any[]): string {
  // Add custom formatting logic
  return formatted;
}
```

#### Progress Notifications

Add more progress updates in `processChronosInBackground()`:

```typescript
await callback({
  text: `Stage 2/4: Knowledge graph generation in progress...`,
});
```

#### Extended Pipeline Stages

Modify the Python script generation in `processChronosInBackground()` to add additional analysis steps.

### Testing

```bash
# 1. Start in development mode
elizaos dev

# 2. Upload a test document via Discord/Telegram

# 3. Monitor logs
LOG_LEVEL=debug elizaos dev

# 4. Check session status
curl http://localhost:3000/chronos/status

# 5. Verify Neo4j data
# Open http://localhost:7474 and run:
# MATCH (n) RETURN n LIMIT 25
```

## Production Deployment

### Recommendations

1. **Use PostgreSQL** instead of SQLite for better concurrency
2. **Run Neo4j on dedicated server** for better performance
3. **Increase timeout** for very large documents
4. **Set up monitoring** with health check endpoints
5. **Configure log aggregation** for troubleshooting
6. **Use process manager** (PM2, systemd) for auto-restart

### Example PM2 Configuration

```bash
pm2 start "elizaos start" --name "chronos-bot" \
  --max-memory-restart 2G \
  --log /var/log/chronos-bot.log
```

### Security Considerations

1. **Secure Neo4j**: Use strong passwords, enable authentication
2. **API Keys**: Store in environment variables, never commit to git
3. **File Cleanup**: Automatic cleanup prevents disk space issues
4. **Rate Limiting**: Consider adding rate limits for uploads
5. **Input Validation**: Only accept valid image formats

## Support & Troubleshooting

### Getting Help

1. Check logs with `LOG_LEVEL=debug`
2. Verify configuration with `/chronos/status` endpoint
3. Test Neo4j connection independently
4. Check Python dependencies are installed
5. Review HeritageNet-example documentation

### Known Limitations

- Processing time is ~25-30 minutes per document (inherent to pipeline)
- Large documents (>200 pages) may timeout - adjust timeout setting
- Concurrent processing limited by Neo4j and Python environment resources
- Results depend on document quality and content

## License

This integration follows the same license as the ElizaOS project.

## Credits

- **Chronos Pipeline**: HeritageNet-example
- **Knowledge Graph**: Neo4j
- **Hypothesis Verification**: FutureHouse API
- **Bot Framework**: ElizaOS
