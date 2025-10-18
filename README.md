# DISCORDxCHRONOS

A comprehensive project integrating Discord bot functionality with advanced AI-driven knowledge graph analysis using the ELIZA framework and Chronos temporal reasoning.

## Features

- **Discord Bot Integration**: Seamless Discord bot functionality with custom commands and interactions
- **AI-Powered Knowledge Graph**: Advanced knowledge graph discovery and hypothesis verification
- **Temporal Reasoning**: Chronos-based temporal analysis for pattern discovery
- **OCR Processing**: Optical character recognition for document analysis
- **Multi-Modal Analysis**: Support for text, images, and complex data structures

## Project Structure

```
├── hen/                          # Main application directory
│   ├── src/                     # Source code
│   │   ├── actions/            # Bot actions and commands
│   │   ├── evaluators/         # Evaluation modules
│   │   ├── services/           # Core services
│   │   ├── frontend/           # Web interface components
│   │   └── __tests__/          # Comprehensive test suite
│   ├── HeritageNet-example/     # Example implementation
│   ├── chronos_output/         # Output files from Chronos processing
│   ├── hypothesis_results/     # Results from hypothesis verification
│   ├── debug_images/           # Debug image outputs
│   └── discord_main.py         # Main Discord bot entry point
├── .gitignore                  # Git ignore patterns
└── README.md                   # This file
```

## Technology Stack

- **Backend**: Python with AI/ML frameworks
- **Frontend**: TypeScript, React, Vite
- **Database**: PostgreSQL (via ELIZA)
- **Bot Framework**: Discord.py
- **AI/ML**: Custom knowledge graph algorithms, OCR engines
- **Testing**: Cypress for E2E, Jest for unit tests
- **Build Tools**: Bun, Docker

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- Docker (optional)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SACHokstack/DISCORDxCHRONOS.git
cd DISCORDxCHRONOS
```

2. Install dependencies:
```bash
cd hen
pip install -r chronos_full_requirements.txt
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the Discord bot:
```bash
python discord_main.py
```

## Usage

The project includes several key components:

- **Discord Bot**: Handles user interactions and commands
- **Knowledge Graph Discovery**: Analyzes documents and builds knowledge graphs
- **Hypothesis Verification**: Tests hypotheses against collected data
- **Temporal Analysis**: Performs time-based pattern recognition

## Development

### Testing

Run the full test suite:
```bash
npm run test:all
```

### Docker

Build and run with Docker:
```bash
docker-compose up --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with the ELIZA framework
- Powered by Chronos temporal reasoning
- Discord bot integration for enhanced user experience
