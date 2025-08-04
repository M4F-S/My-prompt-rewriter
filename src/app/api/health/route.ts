import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Health check endpoint for production monitoring
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check environment variables
    const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-key-here');
    const hasSerpApiKey = !!(process.env.SERPAPI_API_KEY && process.env.SERPAPI_API_KEY !== 'your-key-here');
    
    // Test Groq API connection with minimal request
    let groqStatus = 'unknown';
    let groqLatency = 0;
    
    if (hasGroqKey) {
      try {
        const groq = new Groq({
          apiKey: process.env.GROQ_API_KEY,
          timeout: 5000, // 5 second timeout for health check
        });
        
        const testStart = Date.now();
        await groq.chat.completions.create({
          messages: [{ role: 'user', content: 'test' }],
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1,
          temperature: 0,
        });
        groqLatency = Date.now() - testStart;
        groqStatus = 'healthy';
      } catch (error: any) {
        groqStatus = error.status === 429 ? 'rate_limited' : 'error';
        groqLatency = Date.now() - startTime;
      }
    } else {
      groqStatus = 'no_api_key';
    }
    
    const totalLatency = Date.now() - startTime;
    
    const healthData = {
      status: groqStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0', // Updated version with llama-3.3-70b-versatile
      model: 'llama-3.3-70b-versatile',
      services: {
        groq: {
          status: groqStatus,
          latency: groqLatency,
          configured: hasGroqKey,
        },
        serpapi: {
          status: hasSerpApiKey ? 'configured' : 'not_configured',
          configured: hasSerpApiKey,
        },
      },
      performance: {
        total_latency: totalLatency,
        memory_usage: process.memoryUsage(),
      },
      features: {
        modes: 7,
        web_search: hasSerpApiKey,
        self_improvement: true,
        framework_optimization: true,
      },
    };
    
    return NextResponse.json(healthData, {
      status: groqStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      latency: Date.now() - startTime,
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}