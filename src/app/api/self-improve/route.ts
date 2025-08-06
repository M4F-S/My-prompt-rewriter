import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

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
 * - Superior reasoning capabilities for self-improvement tasks
 * - Better understanding of quality enhancement requirements
 * - Enhanced performance for iterative prompt refinement
 * - Consistent with main rewrite endpoint for uniform quality
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Context Window: 131,072 tokens maximum
 * - Max Completion Tokens: 32,768 tokens
 * - Character-to-Token Ratio: ~4:1 (approximate for length estimation)
 */
const MODEL_CONFIG = {
  name: 'llama-3.3-70b-versatile',
  maxContextTokens: 131072,
  maxCompletionTokens: 32768,
  charToTokenRatio: 4,
};

// Enhanced error handling with user-friendly messages
const ERROR_MESSAGES = {
  RATE_LIMIT: 'Service is experiencing high demand. Please wait a moment and try again.',
  PAYLOAD_TOO_LARGE: 'Your content is too long. Please shorten it and try again.',
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
function validateTokenLimits(systemInstructions: string, userMessage: string): boolean {
  const systemTokens = estimateTokenCount(systemInstructions);
  const userTokens = estimateTokenCount(userMessage);
  const totalInputTokens = systemTokens + userTokens;
  
  // Reserve space for completion (use 80% of context for input, 20% for output)
  const maxInputTokens = MODEL_CONFIG.maxContextTokens * 0.8;
  
  console.log(`🔍 Self-Improve Token Estimation:
    System: ${systemTokens} tokens
    User: ${userTokens} tokens  
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
      console.log(`🚀 Self-Improve Groq API Call Attempt ${attempt + 1}/${retries} - Model: ${MODEL_CONFIG.name}`);
      
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
      console.log(`✅ Self-Improve Groq API Success:
        Duration: ${duration}ms
        Model: ${MODEL_CONFIG.name}
        Usage: ${completion.usage?.total_tokens || 'N/A'} total tokens
        Completion: ${completion.usage?.completion_tokens || 'N/A'} tokens`);
      
      return completion;
      
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      console.error(`❌ Self-Improve Groq API Error (Attempt ${attempt + 1}/${retries}):`, {
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

// System instructions for each mode (enhanced for llama-3.3-70b-versatile)
const SYSTEM_INSTRUCTIONS = {
  'question-research': `You are a Research Analysis Specialist optimized for synthesizing information and answering complex questions. Your primary function is to analyze queries, conduct targeted research, and deliver evidence-based responses that reduce ambiguity by 80% or more.

Take the provided output and create an improved version that enhances clarity, completeness, and effectiveness. Focus on better research methodology, source verification, and evidence-based analysis while maintaining the original topic.

Output only the improved version without explanatory text or critique.`,

  'report-writing': `You are a Senior Business Report Writing Specialist with 15+ years of experience in creating executive-level documents for Fortune 500 companies. Your expertise includes strategic analysis, data visualization, stakeholder communication, and regulatory compliance reporting.

Take the provided report writing prompt and create a significantly enhanced version that includes:

ENHANCED STRUCTURE:
- More detailed executive summary requirements with specific KPI metrics
- Comprehensive methodology section with data collection protocols
- Advanced analysis frameworks and evaluation criteria
- Professional formatting standards and visual design specifications
- Detailed appendices and supporting documentation requirements

PROFESSIONAL EXCELLENCE:
- Stakeholder-specific communication strategies
- Risk assessment and mitigation planning
- Compliance and regulatory considerations
- Quality assurance and peer review processes
- Distribution and presentation guidelines

STRATEGIC DEPTH:
- Market context and competitive analysis requirements
- Financial impact assessments and ROI calculations
- Implementation roadmaps and timeline specifications
- Success measurement and KPI tracking systems
- Follow-up and monitoring protocols

Transform the provided prompt into a comprehensive, enterprise-grade report writing brief that would meet the standards of top-tier consulting firms. Output only the improved version without explanatory text or critique.`,

  'coding-agent': `You are a Senior Software Engineering Specialist with expertise in full-stack development, system architecture, and best practices implementation. Your function is to provide technical solutions that are production-ready, well-documented, and maintainable.

Take the provided output and create an improved version that enhances clarity, completeness, and effectiveness. Focus on better technical specifications, testing requirements, and best practices while maintaining the original functionality.

Output only the improved version without explanatory text or critique.`,

  'multi-tool-agent': `You are an AI Agent Command Optimizer that refines and enhances direct executable instructions for AI agents managing complex multi-tool workflows. Your function is to take existing agent commands and make them more precise, efficient, and robust.

Take the provided AI agent commands and create an improved version that enhances precision, error handling, and execution efficiency. Focus on clearer tool invocations, better coordination protocols, and more robust error handling while maintaining the direct command structure.

Ensure the output remains in imperative command format suitable for AI agent execution. Use action verbs like "Execute", "Initialize", "Coordinate", "Monitor", "Validate".

Output only the improved agent commands without explanatory text or critique.`,

  'document-rewriting': `You are a Professional Document Transformation Specialist. Your expertise lies in converting informal, unstructured communication into polished, professional documents. You specialize in restructuring emails, reports, memos, and business correspondence while preserving original intent and enhancing clarity through formal document standards.

Take the provided content and create an improved version that enhances professionalism, clarity, and structure. Focus on better tone, organization, sequential order, and business communication standards while maintaining the original intent.

Output only the improved version without explanatory text or critique.`,

  'framework-optimization': `You are a Master Prompt Engineering Framework Specialist with expertise in advanced 2025 RACE, CRISP, and Chain-of-Thought methodologies. Your function is to create optimized framework structures that maximize AI performance through precise constraint specification and measurable outcome definition.

Take the provided framework-structured output and create a significantly enhanced version. Each component must be more detailed, specific, and actionable.

ENHANCEMENT REQUIREMENTS:
- Role: More specific expertise areas, capabilities, and behavioral parameters
- Context: Deeper background analysis, constraints, and environmental factors
- Task: More precise objectives, deliverables, and success criteria with measurable outcomes
- Format: Detailed output specifications, structure requirements, and presentation standards
- Rules: Comprehensive guidelines, quality standards, and constraint definitions
- Examples: More relevant, detailed examples with specific use cases

FORMATTING REQUIREMENTS:
- Each component must start on a new line with proper spacing
- Use double line breaks between components for visual separation
- Provide substantial, detailed content for each section (3-5 sentences minimum)
- Maintain logical flow and coherence across all components

Structure your enhanced output exactly as:

Role: [enhanced content with specific expertise and capabilities]

Context: [enhanced content with detailed background and constraints]

Task: [enhanced content with precise objectives and success criteria]

Format: [enhanced content with detailed output specifications]

Rules: [enhanced content with comprehensive guidelines and standards]

Examples: [enhanced content with specific, relevant examples]

Output only the improved framework structure without explanatory text or critique.`,

  'content-generation': `You are a Master Content Creator with expertise in producing publication-ready materials across multiple formats and industries. Your specialization includes engaging storytelling, SEO optimization, and audience-specific communication strategies.

Take the provided content and create an improved version that enhances engagement, clarity, and professional quality. Focus on better structure, more compelling narrative, improved readability, and stronger audience connection while maintaining the original message.

Output only the improved version without explanatory text or critique.`
};

// Valid modes for validation
const VALID_MODES = Object.keys(SYSTEM_INSTRUCTIONS);

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { currentOutput, mode } = await request.json();

    // Validate input
    if (!currentOutput || typeof currentOutput !== 'string') {
      return NextResponse.json(
        { error: 'currentOutput is required and must be a string' },
        { status: 400 }
      );
    }

    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `mode is required and must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Production environment validation
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your-key-here') {
      console.error('❌ GROQ_API_KEY not configured properly for self-improve');
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_API_KEY },
        { status: 500 }
      );
    }

    // Get the system instructions for the selected mode
    const systemInstructions = SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS];

    // Create the refinement prompt (simplified to focus only on improvement)
    const refinementPrompt = `Improve this output following your mode instructions. Enhance clarity, completeness, and effectiveness while maintaining the original intent.

Current Output:
${currentOutput}

Provide only the improved version.`;

    // Validate token limits before API call
    if (!validateTokenLimits(systemInstructions, refinementPrompt)) {
      console.warn('⚠️ Self-improve token limit exceeded, request may be truncated');
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
        content: refinementPrompt,
      },
    ];

    // Call Groq API with retry logic and enhanced error handling
    const completion = await callGroqWithRetry(messages, 0.7, 2000);

    // Extract the response
    let improvedOutput = completion.choices[0]?.message?.content;

    if (!improvedOutput) {
      console.error('❌ Empty response from Groq API in self-improve');
      return NextResponse.json(
        { error: ERROR_MESSAGES.GENERIC_ERROR },
        { status: 500 }
      );
    }

    // Clean the response to remove prefixes and format properly
    improvedOutput = cleanResponse(improvedOutput, mode);

    return NextResponse.json({ 
      improvedOutput,
      mode,
      modeName: getModeDisplayName(mode)
    });

  } catch (error: any) {
    console.error('❌ Self-Improve API Error:', {
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
    'content-generation': 'Content Generation Mode',
    'context-engineering': 'Context Engineering Mode',
    'ultimate-mode': 'Ultimate Mode'
  };
  return displayNames[mode] || mode;
}

// Enhanced response cleaning function (consistent with main endpoint)
function cleanResponse(response: string, mode: string): string {
  let cleaned = response.trim();
  
  // Remove common AI prefixes and suffixes
  const prefixPatterns = [
    /^Here is the improved version:?\s*/i,
    /^The improved version is:?\s*/i,
    /^Improved version:?\s*/i,
    /^Here's the improved version:?\s*/i,
    /^Here's an improved version:?\s*/i,
    /^Enhanced version:?\s*/i,
    /^Here is an? (enhanced|improved|optimized):?\s*/i,
    /^The (enhanced|improved|optimized) version:?\s*/i,
  ];
  
  const suffixPatterns = [
    /\s*This improved version\.{3}$/i,
    /\s*I hope this enhanced version helps!?\.?$/i,
    /\s*Let me know if you need further improvements\.?$/i,
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
    const frameworkLines = [];
    const foundComponents = new Set();
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
      'Success Metrics',
      'Quality Assurance',
      'Stakeholder Communication',
      'Risk Assessment',
      'Implementation',
      'Follow-up'
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
