import { useAuth } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Client-side API calls for client components
export function useClientApiCall() {
  const { getToken } = useAuth();

  return async function clientApiCall(endpoint: string, options?: RequestInit) {
    const token = await getToken();
    console.log('useClientApiCall: Token available:', !!token);

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
      console.error('Client API Call Error:', error);
      throw error;
    }
  };
}

// Specific client-side API functions using the hook
export function useGenerateAPIKey() {
  const apiCall = useClientApiCall();

  return async () => {
    return apiCall('/api/keys', { method: 'POST' });
  };
}

export function useGetAPIKeys() {
  const apiCall = useClientApiCall();

  return async () => {
    return apiCall('/api/keys');
  };
}

