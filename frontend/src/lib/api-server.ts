import { auth } from '@clerk/nextjs/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Server-side API calls for server components
export async function serverApiCall(endpoint: string, options?: RequestInit) {
  const { getToken } = await auth();
  const token = await getToken();

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Server API Call Error:', error);
    throw error;
  }
}

// Specific server-side API functions
export async function getUserProfile() {
  return serverApiCall('/api/user/profile');
}

export async function generateAPIKey() {
  return serverApiCall('/api/keys', { method: 'POST' });
}

export async function getAPIKeys() {
  return serverApiCall('/api/keys');
}