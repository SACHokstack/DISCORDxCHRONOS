# Debug Test - Enhanced Logging

I've added extensive logging to help diagnose why Chronos isn't being triggered. Here's what to look for:

## Start the Bot

```bash
cd /home/sach/ELIZAOS!/Discord_working_chronos/hen
elizaos dev
```

## Step 1: Check Plugin Registration (Startup Logs)

When the bot starts, you should see:

```
✅ EXPECTED STARTUP LOGS:
Info  *** Initializing starter plugin ***
Info  🔬 CHRONOS PLUGIN PRIORITY: 1000 (HIGH)
Info  🎯 Registering 2 actions
Info  📊 Registering 1 evaluators
Info  ⚙️ Registering 2 services
Info  ✅ Chronos configuration validated
Info     CHRONOS_MAIN_PATH: /home/sach/ELIZAOS!/Discord_working_chronos/hen/HeritageNet-example/app/main.py
Info     NEO4J_URL: neo4j://127.0.0.1:7687
Info  📋 Registered Actions:
Info     - PROCESS_CHRONOS_IMAGE
Info     - HELLO_WORLD
Info  *** Starting Chronos service ***
```

**❌ If you DON'T see these logs**, the plugin isn't loading. Check:
- Is `src/index.ts` correct? Should have `plugins: [starterPlugin]`
- Did the build succeed?

## Step 2: Upload an Image to Discord

Upload ANY image or PDF to your Discord bot.

## Step 3: Check Message Processing Logs

You should see:

```
✅ EXPECTED WHEN IMAGE UPLOADED:
Info  #Eliza  [Bootstrap] Message received from...
Info  MESSAGE_RECEIVED event received
Info  🔍 CHRONOS ACTION VALIDATE CALLED            <-- KEY LINE!
Info  Message content: {"text":"","attachments":[...]}
Info  ✅ Found 1 attachments
Info  Document/image attachment detected, validating for Chronos processing
Info  🔬 Chronos Action Handler Triggered
Info  Starting Chronos pipeline for user XXX, session chronos_YYY
```

**❌ If you DON'T see "🔍 CHRONOS ACTION VALIDATE CALLED"**, the action isn't being checked at all. This means:
- Actions might not be registered correctly
- Or Bootstrap is blocking it somehow

**❌ If you see "VALIDATE CALLED" but then "❌ No attachments found"**, the message doesn't have attachments in the format we expect.

## Step 4: Share the Full Logs

Copy the ENTIRE log output from startup to after uploading the image and share it. Specifically look for:

1. **Startup**: All the "Initializing starter plugin" messages
2. **Message Received**: The "MESSAGE_RECEIVED event received"
3. **Chronos Validation**: The "🔍 CHRONOS ACTION VALIDATE CALLED" (or absence of it)
4. **Errors**: Any error messages

## Quick Test Commands

```bash
# 1. Check if plugin file is correct
cat src/index.ts | grep -A2 "plugins:"
# Should show: plugins: [starterPlugin]

# 2. Check environment variables
echo "CHRONOS_MAIN_PATH: $CHRONOS_MAIN_PATH"
echo "NEO4J_URL: $NEO4J_URL"

# 3. Start with maximum debug output
LOG_LEVEL=debug elizaos dev 2>&1 | tee chronos-debug.log
# Then upload image and send me chronos-debug.log
```

## What Each Log Means

| Log Message | Meaning |
|------------|---------|
| `*** Initializing starter plugin ***` | Plugin is loading ✅ |
| `🔬 CHRONOS PLUGIN PRIORITY: 1000` | High priority set ✅ |
| `📋 Registered Actions: PROCESS_CHRONOS_IMAGE` | Action registered ✅ |
| `🔍 CHRONOS ACTION VALIDATE CALLED` | Action being checked ✅ |
| `✅ Found N attachments` | Attachments detected ✅ |
| `🔬 Chronos Action Handler Triggered` | Processing started ✅ |
| `Error analyzing image: No endpoints` | Bootstrap ran instead ❌ |

## Expected vs Current Behavior

**Current (Bad)**:
```
Message received → Bootstrap tries vision → Fails with grok error
```

**Expected (Good)**:
```
Message received → Chronos validates → Chronos processes → Pipeline runs
```

---

Run the bot, upload an image, and share:
1. Startup logs (from launch to ready)
2. Message processing logs (from upload to response)

This will tell us exactly where the flow is breaking.
