import { NextApiRequest, NextApiResponse } from 'next';
import { validateReceiptIos } from 'react-native-iap';
import crypto from 'crypto';

// Rate limiting storage (in production, use Redis or database)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per 15 minutes per IP

// Request validation
function validateRequest(req: NextApiRequest): { isValid: boolean; error?: string } {
  const { receiptData, isTest } = req.body;
  
  if (!receiptData || typeof receiptData !== 'string') {
    return { isValid: false, error: 'Invalid receipt data' };
  }
  
  if (receiptData.length > 50000) { // Reasonable limit for receipt data
    return { isValid: false, error: 'Receipt data too large' };
  }
  
  if (isTest !== undefined && typeof isTest !== 'boolean') {
    return { isValid: false, error: 'Invalid test flag' };
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
  const expectedApiKey = process.env.IAP_API_SECRET_KEY;
  
  if (!expectedApiKey) {
    console.warn('IAP_API_SECRET_KEY not configured');
    return { isValid: false, error: 'Server configuration error' };
  }
  
  if (!apiKey) {
    return { isValid: false, error: 'API key required' };
  }
  
  // Use constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(apiKey, 'utf8'),
    Buffer.from(expectedApiKey, 'utf8')
  );
  
  if (!isValid) {
    return { isValid: false, error: 'Invalid API key' };
  }
  
  return { isValid: true };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const requestId = crypto.randomUUID();
  
  // Log request start
  console.log(`[${requestId}] IAP verification request from ${clientIP}`);
  
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Mobile app origin validation
    const originResult = validateMobileAppOrigin(req);
    if (!originResult.isValid) {
      console.log(`[${requestId}] Origin validation failed: ${originResult.error}`);
      return res.status(403).json({ error: originResult.error });
    }

    // 2. API Key authentication
    const authResult = validateApiKey(req);
    if (!authResult.isValid) {
      console.log(`[${requestId}] Authentication failed: ${authResult.error}`);
      return res.status(401).json({ error: authResult.error });
    }

    // 3. Rate limiting
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[${requestId}] Rate limit exceeded for ${clientIP}`);
      return res.status(429).json({ error: rateLimitResult.error });
    }

    // 4. Request validation
    const validationResult = validateRequest(req);
    if (!validationResult.isValid) {
      console.log(`[${requestId}] Request validation failed: ${validationResult.error}`);
      return res.status(400).json({ error: validationResult.error });
    }

    const { receiptData, isTest } = req.body;
    const sharedSecret = process.env.APPLE_SHARED_SECRET;
    
    if (!sharedSecret) {
      console.warn(`[${requestId}] Apple Shared Secret not configured`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Apple 서버로 영수증 검증
    console.log(`[${requestId}] Validating receipt with Apple (test: ${isTest})`);
    
    const result = await validateReceiptIos({
      receiptBody: {
        'receipt-data': receiptData,
        password: sharedSecret,
      },
      isTest: isTest || false,
    });

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Apple validation completed in ${processingTime}ms, status: ${result.status}`);
    
    // Don't expose full receipt data in response for security
    const response = { 
      isValid: result.status === 0,
      status: result.status
    };

    return res.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Receipt validation error after ${processingTime}ms:`, error);
    
    return res.status(500).json({ 
      error: 'Validation failed',
      isValid: false 
    });
  }
}