/**
 * Simple network connectivity check utility
 */
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to check connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      timeout: 3000,
    });
    return response.ok;
  } catch (error) {
    console.log('Network check failed:', error);
    return false;
  }
};

/**
 * Check if device is online by attempting to reach multiple endpoints
 */
export const isOnline = async (): Promise<boolean> => {
  const endpoints = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://www.apple.com/favicon.ico',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        timeout: 2000,
      });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Continue to next endpoint
      continue;
    }
  }
  
  return false;
};