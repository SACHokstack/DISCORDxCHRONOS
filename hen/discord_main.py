"""
Discord-specific wrapper for Chronos main.py
Processes a single image and returns hypothesis results
"""

import sys
import os
from pathlib import Path

# Add HeritageNet-example/app directory to path (discord_main.py is in hen folder now)
sys.path.insert(0, str(Path(__file__).parent / "HeritageNet-example" / "app"))

from pipeline import run_pipeline
from neo4j_utils import verify_knowledge_graph
from kg_pattern_discovery import KGPatternDiscovery
from hypothesis_verifier import HypothesisVerifier
from neo4j_cleanup import clear_neo4j_database
from datetime import datetime


def process_discord_image(image_path: str, user_id: str = "discord_user", session_id: str = None):
    """
    Process a single Discord image through the full Chronos pipeline.

    Args:
        image_path: Path to the downloaded image
        user_id: Discord user ID for tracking
        session_id: Unique session ID for this processing run
    """

    # Configuration
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_id = session_id or f"discord_{timestamp}"
    element_id = f"discord_{user_id}_{timestamp}"

    # Paths (discord_main.py is in hen folder, HeritageNet-example is sibling directory)
    script_dir = Path(__file__).parent  # hen folder
    chronos_dir = script_dir / "HeritageNet-example"
    output_text_file = script_dir / "chronos_output" / f"{element_id}_text.txt"
    output_text_file.parent.mkdir(exist_ok=True)

    # Neo4j Configuration from environment (.env is in hen folder)
    from dotenv import load_dotenv
    load_dotenv(script_dir / ".env")

    NEO4J_URL = os.environ.get("NEO4J_URL", "neo4j://127.0.0.1:7687")
    NEO4J_USERNAME = os.environ.get("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "today-craft-film-snake-enigma-9518")

    # Pipeline Configuration - matches run_pipeline() parameters
    # Note: pipeline.py will automatically filter PDF-only params for images
    PIPELINE_CONFIG = {
        # OCR settings
        "ocr_preprocessing": True,
        "enhancement_level": "aggressive",
        "use_high_dpi": True,           # PDF only - filtered out for images by pipeline
        "use_advanced_ocr": True,
        "medical_context": True,
        "save_debug_images": False,
        "try_native_text": True,        # PDF only - filtered out for images by pipeline

        # Knowledge Graph settings
        "use_advanced_kg": False,       # Use GPT-4o-mini (cost effective)
        "kg_chunk_size": 10000,
        "enable_chunking": True,
        "element_id": element_id
    }

    print("\n" + "="*80)
    print("🚀 CHRONOS PIPELINE - DISCORD IMAGE PROCESSING")
    print("="*80)
    print(f"📄 File: {Path(image_path).name}")
    print(f"👤 User: {user_id}")
    print(f"🆔 Session: {session_id}")
    print(f"🔖 Element: {element_id}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

    try:
        # STEP 0: Clear Neo4j database for isolated analysis
        print("\n" + "="*80)
        print("🧹 CLEARING NEO4J DATABASE")
        print("="*80)
        print(f"Clearing previous data to ensure isolated analysis for session {session_id}...")

        clear_success = clear_neo4j_database(
            neo4j_url=NEO4J_URL,
            neo4j_username=NEO4J_USERNAME,
            neo4j_password=NEO4J_PASSWORD
        )

        if not clear_success:
            print("⚠️  Warning: Neo4j cleanup may have failed, continuing anyway...")

        # STEP 1: Run OCR and Knowledge Graph Generation
        print("\n" + "="*80)
        print("📊 STEP 1/4: OCR & KNOWLEDGE GRAPH GENERATION")
        print("="*80)

        extracted_text, graph_elements = run_pipeline(
            input_file=image_path,
            output_text_file=str(output_text_file),
            neo4j_url=NEO4J_URL,
            neo4j_username=NEO4J_USERNAME,
            neo4j_password=NEO4J_PASSWORD,
            **PIPELINE_CONFIG
        )

        print(f"\n✅ Step 1 Complete:")
        print(f"   - Characters extracted: {len(extracted_text):,}")
        print(f"   - Text saved to: {output_text_file.name}")

        # STEP 2: Verify Knowledge Graph
        print("\n" + "="*80)
        print("🔍 STEP 2/4: KNOWLEDGE GRAPH VERIFICATION")
        print("="*80)

        kg_success = verify_knowledge_graph(
            uri=NEO4J_URL,
            username=NEO4J_USERNAME,
            password=NEO4J_PASSWORD,
            show_samples=False
        )

        if not kg_success:
            print("⚠️  Warning: Knowledge graph appears empty, but continuing...")

        # STEP 3: Pattern Discovery
        print("\n" + "="*80)
        print("📊 STEP 3/4: PATTERN DISCOVERY")
        print("="*80)

        try:
            pattern_discovery = KGPatternDiscovery(
                neo4j_url=NEO4J_URL,
                neo4j_username=NEO4J_USERNAME,
                neo4j_password=NEO4J_PASSWORD
            )

            patterns = pattern_discovery.discover_patterns(
                max_length=3,
                max_patterns_per_length=5
            )
            pattern_discovery.close()

            # Extract questions
            questions = [p['question'] for p in patterns if p.get('question')]

            if not questions:
                print("\n⚠️  No questions generated from patterns")
                print("\nDISCORD_RESULTS_START")
                print("ERROR:::No patterns found in document")
                print("DISCORD_RESULTS_END")
                return

            print(f"\n✅ Step 3 Complete:")
            print(f"   - Patterns discovered: {len(patterns)}")
            print(f"   - Questions generated: {len(questions)}")

            # STEP 4: Hypothesis Verification
            print("\n" + "="*80)
            print("🔬 STEP 4/4: HYPOTHESIS VERIFICATION")
            print("="*80)

            results_dir = chronos_dir / "hypothesis_results" / session_id
            results_dir.mkdir(parents=True, exist_ok=True)

            verifier = HypothesisVerifier(output_dir=str(results_dir))
            results = verifier.verify_questions_sync(questions)
            verifier.close()

            print(f"\n✅ Step 4 Complete:")
            print(f"   - Hypotheses verified: {len(results)}")
            print(f"   - Results saved to: {results_dir}")

            # Output results in a parseable format for Discord bot
            print("\n" + "="*80)
            print("✅ CHRONOS PIPELINE COMPLETE")
            print("="*80)
            print(f"Session: {session_id}")
            print(f"Processing time: {datetime.now().strftime('%H:%M:%S')}")
            print("="*80)

            # Format results for Discord bot consumption
            print("\nDISCORD_RESULTS_START")
            print(f"SESSION:::{session_id}")
            print(f"USER:::{user_id}")
            print(f"TIMESTAMP:::{datetime.now().isoformat()}")
            print(f"TOTAL_QUESTIONS:::{len(results)}")
            print("---")

            for i, result in enumerate(results, 1):
                question = result.get('question', 'No question')
                answer = result.get('owl_answer', 'No answer')
                confidence = result.get('confidence', 'N/A')

                # Clean up the text for Discord
                question = question.strip().replace('\n', ' ')
                answer = answer.strip().replace('\n', ' ')

                print(f"Q{i}:::{question}")
                print(f"A{i}:::{answer}")
                print(f"C{i}:::{confidence}")
                print("---")

            print("DISCORD_RESULTS_END")

        except Exception as e:
            print(f"\n⚠️  Pattern discovery/verification failed: {e}")
            import traceback
            traceback.print_exc()

            print("\nDISCORD_RESULTS_START")
            print(f"ERROR:::Pattern discovery failed: {str(e)}")
            print("DISCORD_RESULTS_END")

    except Exception as e:
        print(f"\n\n❌ PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()

        print("\nDISCORD_RESULTS_START")
        print(f"ERROR:::Pipeline failed: {str(e)}")
        print("DISCORD_RESULTS_END")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python discord_main.py <image_path> [user_id] [session_id]")
        sys.exit(1)

    image_path = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 else "discord_user"
    session_id = sys.argv[3] if len(sys.argv) > 3 else None

    if not os.path.exists(image_path):
        print(f"❌ Error: Image not found at {image_path}")
        print("\nDISCORD_RESULTS_START")
        print(f"ERROR:::File not found: {image_path}")
        print("DISCORD_RESULTS_END")
        sys.exit(1)

    process_discord_image(image_path, user_id, session_id)
