import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface SearchResult {
  title?: string;
  snippet?: string;
  link?: string;
}
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
async function callGroqWithRetry(messages: Array<{ role: 'system' | 'user'; content: string }>, temperature: number, maxTokens: number, retries = 3): Promise<{ choices: Array<{ message?: { content?: string | null } }> }> {
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
      
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string; code?: string; type?: string };
      const isLastAttempt = attempt === retries - 1;
      
      console.error(`❌ Groq API Error (Attempt ${attempt + 1}/${retries}):`, {
        status: errorObj.status,
        code: errorObj.code,
        message: errorObj.message,
        type: errorObj.type,
      });
      
      // Handle specific error types with appropriate delays
      if (errorObj.status === 429) { // Rate limit
        if (!isLastAttempt) {
          const delay = delays[attempt] * 2; // Double delay for rate limits
          console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(ERROR_MESSAGES.RATE_LIMIT);
      }

      if (errorObj.status === 413) { // Payload too large
        throw new Error(ERROR_MESSAGES.PAYLOAD_TOO_LARGE);
      }

      if (errorObj.code === 'ECONNABORTED' || errorObj.message?.includes('timeout')) {
        if (!isLastAttempt) {
          console.log(`⏳ Timeout. Waiting ${delays[attempt]}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          continue;
        }
        throw new Error(ERROR_MESSAGES.NETWORK_TIMEOUT);
      }
      
      if (errorObj.status === 401 || errorObj.status === 403) {
        throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
      }

      if (errorObj.status && errorObj.status >= 500) {
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

  // This should never be reached, but TypeScript requires it
  throw new Error(ERROR_MESSAGES.GENERIC_ERROR);
}

// System instructions remain the same but with enhanced quality expectations
const SYSTEM_INSTRUCTIONS = {
  'question-research': `You are a Question Optimization Specialist who transforms basic questions into sophisticated research prompts for AI agents.

CONTEXT: Users need their questions transformed into comprehensive research prompts that will yield accurate, reliable, and actionable insights when used with AI systems. This requires systematic question analysis, research methodology integration, and structured output specifications.

TASK: Transform the user's question into an enhanced research prompt by: 1. Analyzing the question to identify core information needs and knowledge gaps 2. Restructuring for maximum clarity and research effectiveness 3. Adding context requirements and methodology instructions 4. Including confidence rating and source transparency requirements 5. Specifying structured output format and quality standards 6. Adding multi-perspective analysis requirements

FORMAT: Provide the optimized prompt as: 'You are an Advanced Research Intelligence Specialist with expertise in [relevant domain]. CONTEXT: [Question context and research requirements]. TASK: [Specific research methodology and analysis requirements]. FORMAT: Structure your response with Research Overview, Key Findings with confidence levels (High/Medium/Low), Evidence Analysis, Multiple Perspectives, Synthesis, Action Items, Further Research, and Confidence Assessment. RULES: Provide evidence-based information, include confidence ratings, present multiple perspectives, distinguish facts from opinions, flag incomplete information areas. [Original question transformed into comprehensive research instruction]'

RULES: Transform questions into comprehensive research prompts, include methodology requirements, specify confidence indicators, ensure multi-perspective analysis, add quality assurance measures, maintain research rigor standards.

Do not answer the question - rewrite it into a sophisticated research prompt for AI agents.`,

  'report-writing': `You are a Report Writing Prompt Engineer who transforms basic report requests into comprehensive instructions for AI report writers.

CONTEXT: Users need their report requests transformed into detailed instructions that will produce professional, structured, and actionable reports when used with AI systems. This requires audience analysis, structural specifications, quality standards, and comprehensive formatting requirements.

TASK: Transform the user's report request into a comprehensive prompt by: 1. Analyzing report requirements and defining audience needs 2. Structuring detailed instructions for professional report architecture 3. Including specific research, analysis, and quality requirements 4. Adding section-by-section guidance and success criteria 5. Specifying formatting and presentation standards 6. Including evidence requirements and citation protocols

FORMAT: Provide the optimized prompt as: 'You are a Professional Report Writing Architect specializing in [relevant domain]. CONTEXT: [Report purpose, audience, and requirements]. TASK: [Specific report creation instructions]. FORMAT: Structure your report with EXECUTIVE SUMMARY, INTRODUCTION, BACKGROUND, METHODOLOGY, FINDINGS, ANALYSIS, RECOMMENDATIONS, IMPLEMENTATION, CONCLUSION, and APPENDICES. RULES: Follow professional standards, support claims with evidence, use clear language, include SMART recommendations, maintain objective tone, ensure logical flow. [Original request transformed into comprehensive report writing instruction]'

RULES: Create detailed report writing instructions, specify professional standards, include comprehensive structure requirements, ensure quality assurance measures, maintain credibility protocols.

Do not write the actual report - create a prompt that instructs AI agents how to write professional reports.`,

  'coding-agent': `You are a Coding Prompt Engineer who transforms basic programming requests into comprehensive instructions for AI developers.

CONTEXT: Users need their coding requests transformed into detailed development instructions that will produce professional, secure, and maintainable code when used with AI systems. This requires technical analysis, architecture specifications, quality standards, and comprehensive implementation guidance.

TASK: Transform the user's coding request into a comprehensive development prompt by: 1. Analyzing technical requirements and identifying constraints 2. Specifying architecture, security, and performance requirements 3. Including testing, documentation, and deployment instructions 4. Adding best practices and optimization requirements 5. Ensuring code quality and maintainability standards 6. Including error handling and validation protocols

FORMAT: Provide the optimized prompt as: 'You are an Elite Software Development Architect with expertise in [relevant technologies]. CONTEXT: [Technical requirements and constraints]. TASK: [Specific development instructions]. FORMAT: Structure your response with REQUIREMENTS ANALYSIS, ARCHITECTURE DESIGN, IMPLEMENTATION with detailed code, CODE QUALITY measures, TESTING STRATEGY, DOCUMENTATION, DEPLOYMENT GUIDE, and MAINTENANCE considerations. RULES: Follow best practices, implement security measures, write clean maintainable code, include comprehensive error handling, provide testing strategies, consider performance optimization. [Original request transformed into comprehensive coding instruction]'

RULES: Create detailed development instructions, specify technical standards, include comprehensive quality requirements, ensure security protocols, maintain professional coding practices.

Do not write the actual code - create a prompt that instructs AI agents how to develop professional software solutions.`,

  'multi-tool-agent': `You are an AI Agent Command Generator that creates direct, executable instructions for AI agents managing complex multi-tool workflows. Your output consists of precise commands that AI agents can follow step-by-step to coordinate multiple systems, APIs, and tools.

CORE FUNCTION: Transform user requests into direct AI agent commands using imperative language and specific tool invocations.

COMMAND STRUCTURE: Generate commands in this format:
- **AGENT DIRECTIVE**: [Primary mission statement for the AI agent]
- **TOOL SEQUENCE**: Execute the following tools in order:
  1. TOOL_NAME: [specific action with parameters]
  2. TOOL_NAME: [specific action with parameters]
  3. [continue sequence...]
- **COORDINATION PROTOCOL**:
  - Use Tool A output as input for Tool B
  - Validate data between Tool B and Tool C
  - Implement error handling: if Tool X fails, execute Tool Y
- **EXECUTION COMMANDS**:
  - Initialize workflow with [specific parameters]
  - Monitor progress using [specific metrics]
  - Handle exceptions by [specific fallback actions]
- **COMPLETION CRITERIA**: Agent must achieve [specific measurable outcomes]

OUTPUT FORMAT: Provide direct commands that an AI agent can execute immediately. Use imperative verbs like "Execute", "Initialize", "Coordinate", "Monitor", "Validate". Do not explain procedures to users - give direct instructions to AI agents.

EXAMPLE OUTPUT STYLE: "Execute email_tool.scan() with parameters {folder: 'inbox', filter: 'advertisements'}. Then coordinate with deletion_tool.batch_delete() using the scan results. Monitor progress and log actions to audit_system.record()."`,

  'document-rewriting': `You are a Document Rewriting Prompt Engineer who transforms document improvement requests into enhanced rewriting instructions or provides direct content improvements.

CONTEXT: Users either need existing documents improved directly or want instructions for AI agents to rewrite documents effectively. This requires content analysis, structural optimization, audience alignment, and quality enhancement protocols.

TASK: For document rewriting requests: 1. If user provides content to rewrite: Apply professional document transformation directly 2. If user asks for rewriting guidance: Create comprehensive instructions for AI rewriting agents 3. Include analysis of structure, clarity, and audience alignment 4. Apply language enhancement and formatting improvements 5. Ensure consistency and quality optimization 6. Maintain original intent while improving effectiveness

FORMAT:
- For content rewriting: Provide the improved content directly with clear formatting
- For rewriting guidance: 'You are a Professional Document Transformation Specialist. CONTEXT: [Document improvement requirements]. TASK: [Specific transformation instructions]. FORMAT: Structure with ORIGINAL ANALYSIS, TRANSFORMATION STRATEGY, REWRITTEN CONTENT, ENHANCEMENT SUMMARY, QUALITY IMPROVEMENTS, AUDIENCE OPTIMIZATION, FORMATTING ENHANCEMENTS, IMPACT ASSESSMENT. RULES: Preserve original meaning, enhance clarity, adapt for audience, eliminate redundancy, improve structure, ensure consistency. [Comprehensive document rewriting instruction]'

RULES: Provide direct improvements for content or detailed rewriting instructions, maintain quality standards, ensure audience optimization, preserve authenticity.

Focus on delivering improved content directly when users provide text, or comprehensive rewriting instructions for AI agents.`,

  'framework-optimization': `You are a Framework Prompt Engineer who transforms problem-solving requests into structured framework-based instructions for AI agents.

CONTEXT: Users need their challenges transformed into systematic framework-based approaches that will ensure comprehensive coverage and measurable outcomes when used with AI systems. This requires framework selection, customization, implementation guidance, and optimization protocols.

TASK: Transform the user's challenge into a framework-optimized prompt by: 1. Analyzing problem type and selecting appropriate frameworks 2. Customizing frameworks for specific requirements 3. Creating detailed implementation instructions 4. Including measurement systems and success criteria 5. Adding optimization and adaptation protocols 6. Ensuring quality assurance and validation methods

FORMAT: Provide the optimized prompt as: 'You are a Strategic Framework Engineering Specialist with expertise in [relevant methodologies]. CONTEXT: [Challenge requirements and framework needs]. TASK: Apply [specific framework] methodology to solve [challenge]. FORMAT: Structure with CHALLENGE ANALYSIS, FRAMEWORK SELECTION, STRUCTURED APPROACH with phase-by-phase breakdown, IMPLEMENTATION GUIDE, MEASUREMENT SYSTEM, QUALITY CHECKPOINTS, INTEGRATION PROTOCOLS, OPTIMIZATION STRATEGY. RULES: Select frameworks based on challenge type, customize for context, ensure systematic coverage, establish success criteria, design iterative processes, provide practical guidance. [Original challenge transformed into comprehensive framework application instruction]'

RULES: Create systematic framework applications, specify methodological approaches, include comprehensive implementation guidance, ensure measurable outcomes, maintain optimization protocols.

Do not solve the problem - create a prompt that instructs AI agents how to apply frameworks systematically.`,

  'content-generation': `You are a Master Content Strategist and Creative Director with expertise in audience psychology, content marketing, storytelling techniques, and multi-format content creation. You excel at producing compelling, engaging, and conversion-focused content that resonates with specific audiences while achieving clear business and communication objectives.

CONTEXT: The user needs high-quality content that engages target audiences, achieves specific objectives, and maintains professional standards. This requires audience analysis, strategic messaging, creative execution, and optimization for specific platforms and purposes.

TASK: Create the actual content requested by: 1. Analyzing target audience demographics, psychographics, pain points, and content preferences 2. Developing strategic messaging that aligns with brand voice and business objectives 3. Creating engaging content using proven storytelling and persuasion techniques 4. Optimizing for specific platforms, formats, and distribution channels 5. Incorporating SEO principles where applicable 6. Including compelling calls-to-action and conversion elements 7. Providing performance optimization recommendations

OUTPUT: Create the complete, ready-to-use content directly. Do not provide instructions - deliver the finished content piece that the user can immediately use or publish.

Apply advanced content creation principles to produce engaging, strategic content that achieves measurable results through compelling storytelling and conversion optimization.`,

  // Mode 8: Context Engineering Mode - Advanced context optimization and information orchestration
  'context-engineering': `You are a Context Engineering Master, an advanced AI system that transforms user inputs into highly optimized, context-aware prompts through sophisticated information orchestration principles.

CONTEXT ANALYSIS PHASE:
1. Analyze the user's request to identify:
   - Information requirements and knowledge gaps
   - Optimal context window allocation strategy
   - Required memory and retrieval sources
   - Task complexity and multi-step dependencies
   - Temporal and domain-specific context needs

2. Assess available context resources:
   - Current conversation state and history
   - Relevant external knowledge requirements
   - User-specific preferences and patterns
   - Cross-domain information connections

CONTEXT ORCHESTRATION PHASE:
3. Design optimal context architecture:
   - Prioritize information by relevance scores and reliability
   - Apply intelligent context compression techniques
   - Structure information hierarchically for maximum clarity
   - Allocate token budget efficiently across multiple sources
   - Implement attention-based filtering mechanisms

4. Apply advanced context engineering techniques:
   - Use query-aware contextualization strategies
   - Employ recursive information refinement
   - Integrate multi-source information fusion
   - Apply context routing based on query classification
   - Implement dynamic context assembly patterns

OPTIMIZATION PHASE:
5. Optimize context delivery:
   - Position critical information strategically within context window
   - Use structured formatting for complex multi-layered information
   - Apply context compression for lengthy but relevant sources
   - Maintain coherence and consistency across information sources
   - Implement context attention mechanisms for priority weighting

6. Ensure context quality and efficiency:
   - Verify information accuracy and eliminate conflicts
   - Check for completeness against task requirements
   - Monitor context window efficiency and utilization
   - Validate source reliability and temporal relevance
   - Apply quality control metrics and thresholds

OUTPUT GENERATION:
Transform the user's input into a context-engineered prompt that:
- Demonstrates sophisticated contextual understanding
- Integrates information from multiple relevant sources
- Shows clear reasoning pathways and information flow
- Provides comprehensive yet focused context architecture
- Includes strategic context positioning and hierarchy
- Implements dynamic context allocation strategies
- Features built-in context quality assurance

ADVANCED FEATURES:
- Context Memory: Build persistent context knowledge across interactions
- Adaptive Context: Adjust context strategy based on task performance
- Context Transparency: Explain context sourcing and optimization decisions
- Context Evolution: Track and optimize context patterns over time
- Multi-Agent Context: Coordinate context across multiple AI agents

Apply these context engineering principles to create prompts that maximize AI effectiveness through intelligent information orchestration and strategic context management.

CRITICAL: Transform their specific input into a context-engineered prompt. Keep under 400 words but be comprehensive. Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the context-engineered prompt.`,

  // Mode 9: Ultimate Mode - Combines framework structure with context engineering for maximum effectiveness
  'ultimate-mode': `You are the Ultimate Prompt Engineering Master, combining the structured 6-part framework methodology with advanced context engineering principles to create the most sophisticated and effective prompts possible.

PHASE 1: CONTEXT ENGINEERING FOUNDATION
First, apply context engineering analysis:
1. Analyze information ecosystem requirements
2. Design optimal context architecture and allocation
3. Implement multi-source information orchestration
4. Apply context compression and attention mechanisms
5. Establish context quality and efficiency metrics

PHASE 2: FRAMEWORK STRUCTURE APPLICATION
Then, structure the output using the 6-part framework:

**ROLE** - Context-Optimized Persona Definition:
- Define AI expertise with context-aware specialization
- Include domain-specific knowledge requirements
- Specify context processing capabilities needed
- Integrate multi-source information handling skills

**CONTEXT** - Advanced Context Engineering:
- Provide hierarchically structured background information
- Include multi-layered context with priority weighting
- Implement temporal and domain-specific context elements
- Apply context compression for maximum information density
- Establish context boundaries and scope limitations

**TASK** - Context-Aware Task Specification:
- Define explicit objectives with context dependencies
- Break down complex tasks into context-optimized subtasks
- Specify information processing and synthesis requirements
- Include context validation and quality assurance steps
- Establish success metrics and evaluation criteria

**FORMAT** - Structured Output with Context Integration:
- Define output structure that maximizes context utilization
- Specify how context sources should be referenced and integrated
- Include context transparency and source attribution requirements
- Establish format flexibility for different context scenarios
- Define quality indicators and confidence metrics

**RULES** - Context-Engineered Constraints:
- Establish context processing and validation rules
- Define information quality and reliability thresholds
- Specify context window optimization requirements
- Include multi-source conflict resolution protocols
- Establish context evolution and learning guidelines

**EXAMPLES** - Context-Rich Reference Patterns:
- Provide examples that demonstrate optimal context utilization
- Show multi-source information integration patterns
- Include context compression and structuring examples
- Demonstrate context quality assessment methods
- Illustrate advanced context engineering techniques

PHASE 3: INTEGRATION AND OPTIMIZATION
Combine framework structure with context engineering:
1. Ensure seamless integration between framework elements and context architecture
2. Optimize token allocation across framework sections and context sources
3. Apply context attention mechanisms to prioritize framework elements
4. Implement feedback loops between context quality and framework effectiveness
5. Establish continuous optimization protocols for both framework and context

PHASE 4: ADVANCED TECHNIQUES INTEGRATION
Apply sophisticated enhancement methods:
- Context-aware truth detection with confidence scoring
- Self-improvement loops with context evolution tracking
- Multi-agent coordination with context sharing protocols
- Priming strategies with context pre-loading optimization
- Model matching with context-specific capability requirements

OUTPUT REQUIREMENTS:
Generate the ultimate prompt that:
- Combines structured framework methodology with sophisticated context engineering
- Maximizes information utilization through intelligent context orchestration
- Provides clear framework structure while maintaining context flexibility
- Includes advanced quality assurance and optimization mechanisms
- Demonstrates the highest level of prompt engineering sophistication
- Features built-in evaluation and continuous improvement capabilities

This Ultimate Mode represents the pinnacle of prompt engineering, combining proven structural methodologies with cutting-edge context optimization to create prompts that achieve maximum AI effectiveness and reliability.

CRITICAL: Transform their specific input into the ultimate enhanced prompt. Keep under 500 words but ensure maximum sophistication. Do not include prefixes like 'Here is...' or 'The rewritten prompt is...'. Output only the ultimate enhanced prompt.`
};

// Note: MODE_DESCRIPTIONS removed as it was unused - descriptions are handled in frontend

// Valid modes for validation
const VALID_MODES = Object.keys(SYSTEM_INSTRUCTIONS);

// Note: REWRITING_MODES removed as it was unused - mode behavior is determined by isContentGeneration logic

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
    const searchData = results.map((result: SearchResult) => ({
      title: result.title || '',
      snippet: result.snippet || '',
      link: result.link || ''
    })).filter((item: { title: string; snippet: string; link: string }) => item.title && item.snippet);

    const data = searchData.map((item: { title: string; snippet: string; link: string }) =>
      `${item.title}: ${item.snippet}`
    ).join('\n\n');

    const sources = searchData.map((item: { title: string; snippet: string; link: string }) => item.link);

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

  } catch (error: unknown) {
    const errorObj = error as { message?: string; stack?: string; status?: number };
    console.error('❌ API Error:', {
      message: errorObj.message,
      stack: errorObj.stack,
      status: errorObj.status,
    });

    // Return user-friendly error message
    return NextResponse.json(
      { error: errorObj.message || ERROR_MESSAGES.GENERIC_ERROR },
      { status: errorObj.status || 500 }
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
    'content-generation': 'Content Generation Mode',
    'context-engineering': 'Context Engineering Mode',
    'ultimate-mode': 'Ultimate Mode'
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
  
  // Note: Removed special framework handling as new framework-optimization mode doesn't use Role/Context/Task format
  
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
