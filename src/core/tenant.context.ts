import { AsyncLocalStorage } from 'async_hooks';

// This stores the shopId for the current executing request
export const tenantContext = new AsyncLocalStorage<string>();