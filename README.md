# Prompt Rewriter

A Next.js application that uses the Groq API to analyze and rewrite prompts using four specialized modes, each with its own system instructions optimized for different use cases.

## Features

- **Four Specialized Modes**: Each mode has its own AI system instructions optimized for specific tasks
- **Question/Research Mode**: For research queries and evidence-based responses
- **Report Writing Mode**: For structured document creation and professional reports
- **Coding Agent Mode**: For technical implementation and code generation
- **Multi-Tool Agent Mode**: For complex workflow orchestration and tool integration
- **Modern UI**: Clean, responsive interface with mode selection and descriptions
- **Error Handling**: Graceful error handling for API failures and validation

## Available Modes

### 1. Question/Research Mode
- **Purpose**: Research analysis and evidence-based responses
- **Best For**: Research questions, fact-finding, analytical queries
- **Features**: Source attribution, confidence levels, claim-evidence-reasoning format

### 2. Report Writing Mode
- **Purpose**: Structured document creation and professional reports
- **Best For**: Business reports, academic papers, documentation
- **Features**: Executive summaries, methodology sections, change tracking

### 3. Coding Agent Mode
- **Purpose**: Technical implementation and code generation
- **Best For**: Software development, technical specifications, code reviews
- **Features**: Modular code generation, testing, documentation, deployment guides

### 4. Multi-Tool Agent Mode
- **Purpose**: Complex workflow orchestration and tool integration
- **Best For**: Complex workflows, tool integration, system orchestration
- **Features**: Tool chaining, error recovery, audit logging, behavioral consistency

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Groq API key (free tier available)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

1. Copy the `.env.local` file and add your Groq API key:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace `your-key-here` with your actual Groq API key:
   ```
   GROQ_API_KEY=your-actual-api-key-here
   ```

   **To get a free Groq API key:**
   - Visit [https://console.groq.com/](https://console.groq.com/)
   - Sign up for a free account
   - Generate an API key from the dashboard

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Select a Mode**: Choose the rewriting mode that best matches your needs
2. **Enter Your Prompt**: Type or paste your "lousy" prompt in the text area
3. **Click Rewrite**: Press the "Rewrite Prompt" button to analyze and improve your prompt
4. **Review Results**: The AI will provide mode-specific analysis and rewritten content

## API Endpoint

The application includes a POST endpoint at `/api/rewrite` that:

- Accepts JSON with `userPrompt` and `mode` fields
- Uses mode-specific system instructions for targeted analysis
- Returns structured rewritten prompt or error messages
- Supports four modes: `question-research`, `report-writing`, `coding-agent`, `multi-tool-agent`

### API Request Format
```json
{
  "userPrompt": "Your prompt here",
  "mode": "question-research"
}
```

### API Response Format
```json
{
  "rewrittenPrompt": "Mode-specific rewritten content",
  "mode": "question-research",
  "modeName": "Question/Research Mode"
}
```

## Technical Details

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Provider**: Groq (llama3-8b-8192 model)
- **State Management**: React useState hooks
- **Error Handling**: Comprehensive error handling for API failures

## System Instructions

Each mode uses specialized system instructions:

- **Question/Research**: Focuses on evidence-based responses with source attribution
- **Report Writing**: Emphasizes structured document creation and change tracking
- **Coding Agent**: Optimized for technical implementation and best practices
- **Multi-Tool Agent**: Designed for workflow orchestration and tool integration

## Error Handling

The application handles various error scenarios:

- Missing or invalid API key
- Rate limiting from Groq API
- Network failures
- Invalid input validation
- Invalid mode selection
- Empty responses from AI

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── rewrite/
│   │       └── route.ts          # API endpoint with mode support
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page with mode selector
└── ...
```

### Adding New Modes

To add a new mode:

1. Add the mode key and system instructions to `SYSTEM_INSTRUCTIONS` in `route.ts`
2. Add the mode to `VALID_MODES` array
3. Add display name to `getModeDisplayName` function
4. Add mode description to `MODE_DESCRIPTIONS` in `page.tsx`
5. Add option to the select dropdown in the UI

## Deployment

This application can be deployed to Vercel, Netlify, or any other Next.js-compatible hosting platform.

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `GROQ_API_KEY` environment variable in Vercel dashboard
4. Deploy

## License

MIT License - feel free to use this project for your own applications.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
