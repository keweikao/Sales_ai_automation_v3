/**
 * tRPC Context
 */

export interface Context {
  userId?: string;
}

export function createContext(): Context {
  return {
    userId: undefined,
  };
}
