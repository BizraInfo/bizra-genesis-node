// apps/dashboard/src/journeys/auth/journey.ts
// Auth Journey Definitions - Demo implementations for Synapse pattern

// Simple auth journey functions (demo implementation)
// These would normally use executeJourney with proper JourneyConfig

export async function mockLogin(email: string, password: string): Promise<any> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (email.includes('@') && password.length >= 6) {
    return {
      user: {
        id: 'user-123',
        email: email,
        roles: ['USER']
      },
      sessionToken: 'mock-jwt-token-12345'
    };
  } else {
    throw new Error('Invalid email or password too short');
  }
}

export async function mockRegister(data: any): Promise<any> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (data.email.includes('@') && data.acceptTerms) {
    return {
      user: {
        id: 'user-456',
        email: data.email,
        roles: ['USER']
      },
      sessionToken: 'mock-jwt-token-67890'
    };
  } else {
    throw new Error('Invalid email or terms not accepted');
  }
}
