import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Using native fetch available in Node.js 18+

// Rate limiting storage (in production, use Redis or database)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 50; // 50 requests per 15 minutes per IP

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider?: 'claude' | 'default';
}

interface TranslationResponse {
  translation: string;
  pronunciation?: string;
  error?: string;
}

// Request validation
function validateTranslationRequest(req: NextApiRequest): { isValid: boolean; error?: string } {
  const { text, sourceLanguage, targetLanguage, provider } = req.body;
  
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Invalid text' };
  }
  
  if (text.length > 5000) { // Reasonable limit for translation text
    return { isValid: false, error: 'Text too long (max 5000 characters)' };
  }
  
  if (!sourceLanguage || typeof sourceLanguage !== 'string') {
    return { isValid: false, error: 'Invalid source language' };
  }
  
  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return { isValid: false, error: 'Invalid target language' };
  }
  
  if (provider && !['claude', 'default'].includes(provider)) {
    return { isValid: false, error: 'Invalid provider' };
  }
  
  return { isValid: true };
}

// Rate limiting
function checkRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const key = ip;
  const limit = rateLimit.get(key);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, error: 'Rate limit exceeded' };
  }
  
  limit.count += 1;
  return { allowed: true };
}

// Get client IP
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';
  return ip;
}

// Mobile app origin validation
function validateMobileAppOrigin(req: NextApiRequest): { isValid: boolean; error?: string } {
  const userAgent = req.headers['user-agent'] || '';
  const origin = req.headers.origin || '';
  
  // Check for mobile app characteristics
  const isMobileApp = 
    userAgent.includes('PolyLingo') ||
    origin.includes('capacitor://') ||
    origin.includes('localhost:8081') || // Development
    origin === 'file://'; // Android
    
  if (!isMobileApp) {
    return { isValid: false, error: 'Invalid origin' };
  }
  
  return { isValid: true };
}

// API Key authentication
function validateApiKey(req: NextApiRequest): { isValid: boolean; error?: string } {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.TRANSLATE_API_SECRET_KEY;
  
  if (!expectedApiKey) {
    console.warn('TRANSLATE_API_SECRET_KEY not configured');
    return { isValid: false, error: 'Server configuration error' };
  }
  
  if (!apiKey) {
    return { isValid: false, error: 'API key required' };
  }
  
  // Use constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(apiKey, 'utf8'),
      Buffer.from(expectedApiKey, 'utf8')
    );
    
    if (!isValid) {
      return { isValid: false, error: 'Invalid API key' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid API key format' };
  }
}

// Server-side Claude API translation
async function translateWithClaudeAPI(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translation: string; pronunciation?: string }> {
  const apiKey = process.env.CLAUDE_API_KEY;

  console.log('🔑 API Key check:', apiKey ? 'Found' : 'Missing');

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  let prompt: string;

  if (sourceLang === 'Korean' && targetLang === 'English') {
    prompt = `Translate the following Korean text to English and provide ONLY the English pronunciation (IPA format) of the translated English word/phrase.

IMPORTANT: 
- The pronunciation should be for the ENGLISH translation, NOT the Korean original
- Use IPA (International Phonetic Alphabet) format for English pronunciation
- For example: "안녕" → "hello" → pronunciation: "/həˈloʊ/" or "/hɛˈloʊ/"
- Return ONLY the following JSON. Do not include any explanation, description, or extra text.
- Your response must be a single line JSON object, nothing else.

Text: ${text}

Return the result in this exact JSON format:
{"translation": "<English translation>", "pronunciation": "<IPA pronunciation of English word>"}`;
  } else {
    prompt = `Translate the following ${sourceLang} text to ${targetLang} and provide the pronunciation of the translated ${targetLang} text.

IMPORTANT: 
- The pronunciation must be for the TRANSLATED ${targetLang} text, NOT the original ${sourceLang} text.
- If the target language is not written in the Latin alphabet, provide the pronunciation in Romanized form or IPA.
- DO NOT use the original script for the pronunciation if it is not Latin.
- Return ONLY the following JSON. Do not include any explanation, description, or extra text.
- Your response must be a single line JSON object, nothing else.
- Before returning the result, check again if the pronunciation is for the translated ${targetLang} text and fix it if is required.

Text: ${text}

Return the result in this exact JSON format:
{"translation": "<translated text>", "pronunciation": "<pronunciation of translated text>"}`;
  }

  console.log('🌐 Making request to Claude API...');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  console.log('📡 Claude API response status:', response.status);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    const text = await response.text();
    console.error('Claude API error (raw text):', text);
    throw new Error('Claude API returned non-JSON response');
  }

  if (!response.ok) {
    console.error('Claude API error:', data);
    throw new Error(data?.error?.message || 'Claude API error');
  }

  const content = data?.content?.[0]?.text ?? '';
  let translation = '';
  let pronunciation = '';

  try {
    const parsed = JSON.parse(content);
    translation = parsed.translation;
    pronunciation = parsed.pronunciation;
  } catch {
    translation = content;
  }

  return { translation, pronunciation };
}

// MyMemory fallback translation
async function translateWithMyMemory(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  try {
    const langPair = `${sourceLanguage}|${targetLanguage}`;
    const url = `https://mymemory.translated.net/api/get?q=${encodeURIComponent(
      text
    )}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      let translatedText = data.responseData.translatedText;

      try {
        translatedText = decodeURIComponent(translatedText);
      } catch (e) {
        // If decoding fails, use original text
      }

      return translatedText;
    }

    return null;
  } catch (error) {
    console.error(
      `Translation error for ${sourceLanguage}->${targetLanguage}:`,
      error
    );
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslationResponse>
) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const requestId = crypto.randomUUID();
  
  // Log request start with security info
  console.log(`[${requestId}] Translation request from ${clientIP}`);

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({
      translation: '',
      error: 'Method not allowed',
    });
  }

  try {
    // 1. Mobile app origin validation
    const originResult = validateMobileAppOrigin(req);
    if (!originResult.isValid) {
      console.log(`[${requestId}] Origin validation failed: ${originResult.error}`);
      return res.status(403).json({
        translation: '',
        error: originResult.error,
      });
    }

    // 2. API Key authentication
    const authResult = validateApiKey(req);
    if (!authResult.isValid) {
      console.log(`[${requestId}] Authentication failed: ${authResult.error}`);
      return res.status(401).json({
        translation: '',
        error: authResult.error,
      });
    }

    // 3. Rate limiting
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[${requestId}] Rate limit exceeded for ${clientIP}`);
      return res.status(429).json({
        translation: '',
        error: rateLimitResult.error,
      });
    }

    // 4. Request validation
    const validationResult = validateTranslationRequest(req);
    if (!validationResult.isValid) {
      console.log(`[${requestId}] Request validation failed: ${validationResult.error}`);
      return res.status(400).json({
        translation: '',
        error: validationResult.error,
      });
    }

    const {
      text,
      sourceLanguage,
      targetLanguage,
      provider,
    }: TranslationRequest = req.body;

    console.log(`[${requestId}] Translation request: ${sourceLanguage} -> ${targetLanguage}, length: ${text.length}, provider: ${provider || 'default'}`);

    // Don't log the actual text for privacy

    // Same language case
    if (sourceLanguage === targetLanguage) {
      const processingTime = Date.now() - startTime;
      console.log(`[${requestId}] Same language detected, returning original text in ${processingTime}ms`);
      return res.status(200).json({ translation: text });
    }

    let translation: string | null = null;
    let pronunciation: string | undefined = undefined;

    // Try Claude API first if specified or as default
    if (provider === 'claude' || !provider) {
      try {
        console.log(`[${requestId}] Attempting Claude API translation`);
        const result = await translateWithClaudeAPI(
          text,
          sourceLanguage,
          targetLanguage
        );
        translation = result.translation;
        pronunciation = result.pronunciation;
        console.log(`[${requestId}] Claude API translation successful`);
      } catch (error) {
        console.error(`[${requestId}] Claude API failed:`, error);
        // Continue to fallback
      }
    }

    // Fallback to MyMemory if Claude failed or not available
    if (!translation) {
      console.log(`[${requestId}] Attempting MyMemory fallback`);
      translation = await translateWithMyMemory(
        text,
        sourceLanguage,
        targetLanguage
      );
      if (translation) {
        console.log(`[${requestId}] MyMemory translation successful`);
      }
    }

    if (!translation) {
      const processingTime = Date.now() - startTime;
      console.error(`[${requestId}] All translation services failed after ${processingTime}ms`);
      return res.status(500).json({
        translation: '',
        error: 'Translation service unavailable',
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Translation completed in ${processingTime}ms`);

    return res.status(200).json({
      translation,
      pronunciation,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Translation API error after ${processingTime}ms:`, error);
    return res.status(500).json({
      translation: '',
      error: 'Internal server error',
    });
  }
}
