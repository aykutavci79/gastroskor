import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    backendAccessToken?: string;
    backendExchangeError?: string;
    user: DefaultSession['user'] & {
      id?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendAccessToken?: string;
    backendTokenExpiresAt?: number;
    backendExchangeError?: string;
  }
}
