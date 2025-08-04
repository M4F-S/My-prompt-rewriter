import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import axios from 'axios';

// Initialize Groq client with production-ready configuration
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  // Production timeout: 30 seconds maximum for API calls
  timeout: 30000,
});

/*
 * MODEL CONFIGURATION: llama-3.3-70b-versatile
 * 
 * UPGRADE RATIONALE:
 * - Superior reasoning capabilities compared to llama3-8b-8192
 * - Higher quality output for complex prompt engineering tasks
 * - Better understanding of nuanced instructions and context
 * - Enhanced performance for professional content generation
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Context Window: 131,072 tokens maximum (extremely large context)
 * - Max Completion Tokens: 32,768 tokens
 * - Character-to-Token Ratio: ~4:1 (approximate for length estimation)
 * 
 * IMPORTANT: Monitor prompt length to prevent context overflow
 * Large prompts + system instructions + web data can exceed limits
 */
const MODEL_CONFIG = {
  name: 'llama-3.3-70b-versatile',
  maxContextTokens: 131072,
  maxCompletionTokens: 32768,
  charToTokenRatio: 4, // Approximate: 4 characters ≈ 1 token
};

// Enhanced error handling with user-friendly messages
const ERROR_MESSAGES = {
  RATE_LIMIT: 'Service is experiencing high demand. Please wait a moment and try again.',
  PAYLOAD_TOO_LARGE: 'Your prompt is too long. Please shorten it and try again.',
  NETWORK_TIMEOUT: 'Request timed out. Please check your connection and try again.',
  INVALID_API_KEY: 'Service configuration error. Please contact support.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again in a few minutes.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
};

// Token estimation utility to prevent context overflow
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / MODEL_CONFIG.charToTokenRatio);
}

// Validate total token usage before API call
function validateTokenLimits(systemInstructions: string, userMessage: string, webData: string = ''): boolean {
  const systemTokens = estimateTokenCount(systemInstructions);
  const userTokens = estimateTokenCount(userMessage);
  const webTokens = estimateTokenCount(webData);
  const totalInputTokens = systemTokens + userTokens + webTokens;
  
  // Reserve space for completion (use 80% of context for input, 20% for output)
  const maxInputTokens = MODEL_CONFIG.maxContextTokens * 0.8;
  
  console.log(`🔍 Token Estimation:
    System: ${systemTokens} tokens
    User: ${userTokens} tokens  
    Web Data: ${webTokens} tokens
    Total Input: ${totalInputTokens} tokens
    Max Allowed: ${maxInputTokens} tokens
    Status: ${totalInputTokens <= maxInputTokens ? '✅ SAFE' : '❌ EXCEEDS LIMIT'}`);
  
  return totalInputTokens <= maxInputTokens;
}

// Retry logic with exponential backoff for production resilience
async function callGroqWithRetry(messages: any[], temperature: number, maxTokens: number, retries = 3): Promise<any> {
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`🚀 Groq API Call Attempt ${attempt + 1}/${retries} - Model: ${MODEL_CONFIG.name}`);
      
      const completion = await groq.chat.completions.create({
        messages,
        model: MODEL_CONFIG.name, // UPGRADED: llama-3.3-70b-versatile for superior performance
        temperature,
        max_tokens: Math.min(maxTokens, MODEL_CONFIG.maxCompletionTokens),
        // Production optimizations
        stream: false,
        stop: null,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Detailed logging for production monitoring
      console.log(`✅ Groq API Success:
        Duration: ${duration}ms
        Model: ${MODEL_CONFIG.name}
        Usage: ${completion.usage?.total_tokens || 'N/A'} total tokens
        Completion: ${completion.usage?.completion_tokens || 'N/A'} tokens`);
      
      return completion;
      
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      console.error(`❌ Groq API Error (Attempt ${attempt + 1}/${retries}):`, {
        status: error.status,
        code: error.code,
        message: error.message,
        type: error.type,
      });
      
      // Handle specific error types with appropriate delays
      if (error.status === 429) { // Rate limit
        if (!isLastAttempt) {
          const delay = delays[attempt] * 2; // Double delay for rate limits
          console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(ERROR_MESSAGES.RATE_LIMIT);
      }
      
      if (error.status === 413) { // Payload too large
        throw new Error(ERROR_MESSAGES.PAYLOAD_TOO_LARGE);
      }
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        if (!isLastAttempt) {
          console.log(`⏳ Timeout. Waiting ${delays[attempt]}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          continue;
        }
        throw new Error(ERROR_MESSAGES.NETWORK_TIMEOUT);
      }
      
      if (error.status === 401 || error.status === 403) {
        throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
      }
      
      if (error.status >= 500) {
        if (!isLastAttempt) {
          console.log(`⏳ Server error. Waiting ${delays[attempt]}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          continue;
        }
        throw new Error(ERROR_MESSAGES.SERVICE_UNAVAILABLE);
      }
      
      // If last attempt or unhandled error
      if (isLastAttempt) {
        throw new Error(ERROR_MESSAGES.GENERIC_ERROR);
      }
      
      // Wait before retry for other errors
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
}

// System instructions remain the same but with enhanced quality expectations
const SYSTEM_INSTRUCTIONS = {
  'question-research': `You are a prompt rewriting specialist. Take the user's input and rewrite it as an optimized research prompt. Focus on:
- Adding research methodology requirements
- Including source verification requests  
- Structuring for evidence-based analysis
- Keeping the original topic/intent intact

CRITICAL: Rewrite their specific prompt, don't generate generic templates. Keep under 200 words.
Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the rewritten prompt.`,

  'report-writing': `You are a Professional Business Report Writing Specialist with expertise in creating comprehensive, structured documents that meet enterprise standards. Your task is to transform user prompts into detailed, professional report writing instructions.

Transform the user's input into a comprehensive report writing prompt that includes:

STRUCTURE REQUIREMENTS:
- Executive Summary specifications (key findings, recommendations, scope)
- Methodology section requirements (research approach, data sources, analysis methods)
- Main content organization (logical flow, section headers, subsections)
- Conclusion and recommendations format
- Appendices and supporting materials

PROFESSIONAL STANDARDS:
- Specify target audience and stakeholder considerations
- Include data visualization requirements (charts, graphs, tables)
- Define citation and reference standards
- Establish tone and writing style guidelines
- Set word count and formatting specifications

QUALITY ASSURANCE:
- Require fact-checking and source verification
- Include review and approval processes
- Specify deliverable formats and timelines
- Define success metrics and evaluation criteria

CRITICAL: Transform their specific topic into a detailed, professional report writing brief. Keep under 300 words but be comprehensive. Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the rewritten prompt.`,

  'coding-agent': `You are a prompt rewriting specialist. Take the user's input and rewrite it as an optimized coding prompt. Focus on:
- Adding technology stack specifications
- Including testing and documentation requirements
- Specifying best practices and error handling
- Keeping the original functionality/intent intact

CRITICAL: Rewrite their specific prompt, don't generate generic templates. Keep under 200 words.
Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the rewritten prompt.`,

  'multi-tool-agent': `You are a prompt rewriting specialist. Take the user's input and rewrite it as an optimized multi-tool workflow prompt. Focus on:
- Adding tool integration specifications
- Including error handling strategies
- Defining workflow orchestration steps
- Keeping the original goal/intent intact

CRITICAL: Rewrite their specific prompt, don't generate generic templates. Keep under 200 words.
Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the rewritten prompt.`,

  'document-rewriting': `You are a Professional Document Transformation Specialist. Your task is to directly transform the user's input content into polished, professional documents. You do NOT create prompts - you transform actual content.

Transform the provided content by:
- Converting informal language to professional tone
- Improving structure and clarity with proper sequential order
- Enhancing readability and flow
- Maintaining original intent and key information
- Following business communication standards
- Correcting grammar and improving sentence structure

Output the transformed document directly. Do not create prompts or instructions about transformation.`,

  'framework-optimization': `You are a Prompt Engineering Framework Specialist with expertise in 2025 RACE and CRISP methodologies. Your function is to transform existing prompts into optimized versions that maximize AI performance through structured framework application.

Transform the user's input into a comprehensive 6-part framework structure. Each component must be detailed and specific to their request.

CRITICAL FORMATTING REQUIREMENTS:
- Start each component on a new line with the component name followed by a colon
- Use double line breaks between each component for clear separation
- Provide substantial content for each section (2-4 sentences minimum)
- Maintain the exact order: Role, Context, Task, Format, Rules, Examples

OUTPUT STRUCTURE (follow exactly):

Role: [Define the AI's specific role, expertise, and capabilities relevant to the user's request]

Context: [Provide detailed background, constraints, and situational factors]

Task: [Specify the exact deliverable, objectives, and success criteria]

Format: [Define precise output structure, style, and presentation requirements]

Rules: [List specific guidelines, limitations, and quality standards]

Examples: [Provide concrete examples or templates when helpful]

Transform their specific request using this framework. Keep under 400 words total but ensure each section is comprehensive.`,

  'content-generation': `You are a Professional Content Creator specializing in producing publication-ready materials. Your task is to create complete, engaging content based on the user's request.

Create comprehensive content that includes:
- Compelling headlines and structure
- Well-researched information and insights
- Professional writing style appropriate for the medium
- Engaging introduction and strong conclusion
- Proper formatting and organization

Generate the final content directly. Do not create prompts or instructions about content creation.`
};

// Mode descriptions for user messages
const MODE_DESCRIPTIONS = {
  'question-research': 'general LLM question-answering and research tasks',
  'report-writing': 'structured document creation and professional report writing',
  'coding-agent': 'software development and technical implementation tasks',
  'multi-tool-agent': 'complex workflow orchestration and multi-tool integration',
  'document-rewriting': 'professional document transformation and formalization',
  'framework-optimization': 'RACE and CRISP framework optimization for prompts',
  'content-generation': 'direct content creation and publication-ready deliverables'
};

// Valid modes for validation
const VALID_MODES = Object.keys(SYSTEM_INSTRUCTIONS);

// Modes that should rewrite prompts (not generate content or transform documents)
const REWRITING_MODES = ['question-research', 'report-writing', 'coding-agent', 'multi-tool-agent', 'framework-optimization'];

// SerpApi web search utilities for enhanced content generation
async function performWebSearch(userPrompt: string): Promise<{ data: string; sources: string[] }> {
  try {
    // Check if SerpApi key is configured
    if (!process.env.SERPAPI_API_KEY) {
      console.log('SerpApi key not configured, skipping web search');
      return { data: '', sources: [] };
    }

    // Extract search terms from user prompt
    const searchTerms = extractSearchTerms(userPrompt);
    if (!searchTerms) {
      return { data: '', sources: [] };
    }

    // Perform search using SerpApi with timeout
    const searchUrl = 'https://serpapi.com/search';
    const params = {
      q: searchTerms,
      api_key: process.env.SERPAPI_API_KEY,
      engine: 'google',
      num: 5, // Get top 5 results
      gl: 'us', // US results
      hl: 'en' // English language
    };

    const response = await axios.get(searchUrl, { params, timeout: 10000 });
    const results = response.data.organic_results || [];
    
    if (results.length === 0) {
      return { data: '', sources: [] };
    }

    // Extract relevant information
    const searchData = results.map((result: any) => ({
      title: result.title || '',
      snippet: result.snippet || '',
      link: result.link || ''
    })).filter((item: any) => item.title && item.snippet);

    const data = searchData.map((item: any) => 
      `${item.title}: ${item.snippet}`
    ).join('\n\n');

    const sources = searchData.map((item: any) => item.link);

    return { data, sources };
  } catch (error) {
    console.error('Web search error:', error);
    return { data: '', sources: [] };
  }
}

// Extract relevant search terms from user prompt
function extractSearchTerms(userPrompt: string): string | null {
  const prompt = userPrompt.toLowerCase();
  
  // Common patterns for content generation
  if (prompt.includes('ai') || prompt.includes('artificial intelligence')) {
    return 'latest AI developments 2025 artificial intelligence trends';
  }
  if (prompt.includes('blog') || prompt.includes('article')) {
    const topic = prompt.replace(/write\s+(a\s+)?(blog|article)\s+about\s+/i, '').trim();
    return `${topic} latest news 2025 current developments`;
  }
  if (prompt.includes('technology') || prompt.includes('tech')) {
    return 'latest technology trends 2025 tech developments';
  }
  if (prompt.includes('business') || prompt.includes('marketing')) {
    return 'business trends 2025 marketing strategies';
  }
  if (prompt.includes('health') || prompt.includes('medical')) {
    return 'health trends 2025 medical developments';
  }
  
  // Extract key terms for general topics
  const words = prompt.split(' ').filter(word => word.length > 3);
  if (words.length > 0) {
    return `${words.slice(0, 3).join(' ')} 2025 latest developments`;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { userPrompt, mode = 'question-research', enableWebAccess = false } = await request.json();

    // Validate input
    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'userPrompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Valid modes are: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Production environment validation
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your-key-here') {
      console.error('❌ GROQ_API_KEY not configured properly');
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_API_KEY },
        { status: 500 }
      );
    }

    // Get the system instructions for the selected mode
    const systemInstructions = SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS];
    const modeDescription = MODE_DESCRIPTIONS[mode as keyof typeof MODE_DESCRIPTIONS];

    // Perform web search if enabled and for content generation modes
    let webData = '';
    let webSources: string[] = [];
    let webAccessUsed = false;

    if (enableWebAccess || mode === 'content-generation' || mode === 'document-rewriting') {
      try {
        const webResult = await performWebSearch(userPrompt);
        if (webResult.data && webResult.sources.length > 0) {
          webData = webResult.data;
          webSources = webResult.sources;
          webAccessUsed = true;
        }
      } catch (error) {
        console.error('Web access failed:', error);
        // Continue without web data - graceful degradation
      }
    }

    // Create the user message based on mode type and web data
    let userMessage: string;
    if (mode === 'content-generation') {
      if (webAccessUsed) {
        userMessage = `Use this current information to enhance your content: ${webData}\n\nGenerate complete, publication-ready content for: ${userPrompt}`;
      } else {
        userMessage = `Generate complete, publication-ready content for: ${userPrompt}`;
      }
    } else if (mode === 'document-rewriting') {
      // Document rewriting mode transforms content directly, not prompts
      if (webAccessUsed) {
        userMessage = `Context for enhancement: ${webData}\n\nTransform this content into a professional document:\n\n${userPrompt}`;
      } else {
        userMessage = `Transform this content into a professional document:\n\n${userPrompt}`;
      }
    } else {
      // For rewriting modes - be very explicit about the task
      if (webAccessUsed) {
        userMessage = `Context: ${webData}\n\nREWRITE THIS SPECIFIC PROMPT for ${getModeDisplayName(mode)}:\n"${userPrompt}"\n\nApply your mode's specialization to THEIR specific request. Do not create generic examples.`;
      } else {
        userMessage = `REWRITE THIS SPECIFIC PROMPT for ${getModeDisplayName(mode)}:\n"${userPrompt}"\n\nApply your mode's specialization to THEIR specific request. Do not create generic examples.`;
      }
    }

    // Validate token limits before API call
    if (!validateTokenLimits(systemInstructions, userMessage, webData)) {
      console.warn('⚠️ Token limit exceeded, request may be truncated');
      return NextResponse.json(
        { error: ERROR_MESSAGES.PAYLOAD_TOO_LARGE },
        { status: 413 }
      );
    }

    // Prepare messages for API call
    const messages = [
      {
        role: 'system' as const,
        content: systemInstructions,
      },
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    // Call Groq API with retry logic and enhanced error handling
    const completion = await callGroqWithRetry(
      messages,
      mode === 'content-generation' || mode === 'document-rewriting' ? 0.8 : 0.4,
      mode === 'content-generation' || mode === 'document-rewriting' ? 3000 : 500
    );

    // Extract and clean the response
    let rewrittenPrompt = completion.choices[0]?.message?.content;

    if (!rewrittenPrompt) {
      console.error('❌ Empty response from Groq API');
      return NextResponse.json(
        { error: ERROR_MESSAGES.GENERIC_ERROR },
        { status: 500 }
      );
    }

    // Clean the response to remove prefixes and format properly
    rewrittenPrompt = cleanResponse(rewrittenPrompt, mode);

    return NextResponse.json({ 
      rewrittenPrompt,
      mode,
      modeName: getModeDisplayName(mode),
      isContentGeneration: mode === 'content-generation' || mode === 'document-rewriting',
      webAccessUsed,
      webSources
    });

  } catch (error: any) {
    console.error('❌ API Error:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
    });
    
    // Return user-friendly error message
    return NextResponse.json(
      { error: error.message || ERROR_MESSAGES.GENERIC_ERROR },
      { status: error.status || 500 }
    );
  }
}

// Helper function to get display name for mode
function getModeDisplayName(mode: string): string {
  const displayNames: { [key: string]: string } = {
    'question-research': 'Question/Research Mode',
    'report-writing': 'Report Writing Mode',
    'coding-agent': 'Coding Agent Mode',
    'multi-tool-agent': 'Multi-Tool Agent Mode',
    'document-rewriting': 'Document Rewriting Mode',
    'framework-optimization': 'Framework Optimization Mode',
    'content-generation': 'Content Generation Mode'
  };
  return displayNames[mode] || mode;
}

// Enhanced response cleaning function
function cleanResponse(response: string, mode: string): string {
  let cleaned = response.trim();
  
  // Remove common AI prefixes and suffixes
  const prefixPatterns = [
    /^Here is the rewritten prompt:?\s*/i,
    /^The rewritten prompt is:?\s*/i,
    /^Rewritten prompt:?\s*/i,
    /^Here's the rewritten prompt:?\s*/i,
    /^Here's a rewritten version:?\s*/i,
    /^Rewritten version:?\s*/i,
    /^Here is an? (improved|optimized|rewritten):?\s*/i,
    /^The (improved|optimized|rewritten) prompt:?\s*/i,
  ];
  
  const suffixPatterns = [
    /\s*This rewritten prompt\.{3}$/i,
    /\s*I hope this helps!?\.?$/i,
    /\s*Let me know if you need any adjustments\.?$/i,
  ];
  
  // Remove prefixes
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove suffixes
  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove quotes if the entire response is wrapped in them
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Special handling for framework mode - ensure proper formatting
  if (mode === 'framework-optimization') {
    // Find the first occurrence of "Role:" to start parsing
    const firstRoleIndex = cleaned.search(/^Role:/m);
    if (firstRoleIndex > 0) {
      cleaned = cleaned.substring(firstRoleIndex);
    }
    
    // Parse and reformat the framework structure
    const lines = cleaned.split('\n');
    let frameworkLines = [];
    let foundComponents = new Set();
    let currentComponent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if this line starts a framework component
      const componentMatch = trimmedLine.match(/^(Role|Context|Task|Format|Rules|Examples):/);
      if (componentMatch) {
        const component = componentMatch[1];
        
        // If we've already seen this component, we've hit a duplicate - stop here
        if (foundComponents.has(component)) {
          break;
        }
        
        foundComponents.add(component);
        currentComponent = component;
        
        // Add the component with proper formatting
        if (frameworkLines.length > 0) {
          frameworkLines.push(''); // Add blank line before new component
        }
        frameworkLines.push(line);
      } else if (currentComponent && (trimmedLine === '' || trimmedLine.startsWith(' ') || trimmedLine.startsWith('-') || trimmedLine.startsWith('•'))) {
        // Include empty lines and indented content as part of current component
        frameworkLines.push(line);
      } else if (currentComponent && trimmedLine.length > 0 && !trimmedLine.match(/^(Role|Context|Task|Format|Rules|Examples):/)) {
        // Include continuation text that's part of the current component
        frameworkLines.push(line);
      } else if (trimmedLine.length > 0 && !componentMatch) {
        // If we hit non-framework content and we have at least Role, stop parsing
        if (foundComponents.has('Role')) {
          break;
        }
      }
    }
    
    cleaned = frameworkLines.join('\n');
    
    // Ensure proper spacing between components
    cleaned = cleaned.replace(/\n\n\n+/g, '\n\n'); // Remove excessive blank lines
    cleaned = cleaned.replace(/^(Role|Context|Task|Format|Rules|Examples):/gm, '\n$1:'); // Ensure line break before each component
    cleaned = cleaned.replace(/^\n+/, ''); // Remove leading newlines
    
    // Final formatting pass - ensure each component is properly separated
    const components = ['Role', 'Context', 'Task', 'Format', 'Rules', 'Examples'];
    for (let i = 1; i < components.length; i++) {
      const pattern = new RegExp(`(\\S)\\s*(${components[i]}:)`, 'g');
      cleaned = cleaned.replace(pattern, '$1\n\n$2');
    }
  }
  
  // Special handling for report writing mode - ensure proper structure
  if (mode === 'report-writing') {
    // Add line breaks before common report sections for better readability
    const reportSections = [
      'Executive Summary',
      'Methodology',
      'Background',
      'Analysis',
      'Findings',
      'Recommendations',
      'Conclusion',
      'Appendices',
      'References',
      'Data Sources',
      'Research Approach',
      'Target Audience',
      'Deliverables',
      'Timeline',
      'Success Metrics'
    ];
    
    for (const section of reportSections) {
      const pattern = new RegExp(`([.!?])\\s*(${section}[:\\s])`, 'g');
      cleaned = cleaned.replace(pattern, '$1\n\n$2');
    }
    
    // Ensure bullet points are properly formatted
    cleaned = cleaned.replace(/([.!?])\s*[-•]\s*/g, '$1\n- ');
    cleaned = cleaned.replace(/\n\n\n+/g, '\n\n'); // Remove excessive blank lines
  }
  
  return cleaned.trim();
}
