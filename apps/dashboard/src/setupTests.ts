// Jest setup file for configuring the testing environment
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

type ImportMetaEnvMock = Record<string, string | boolean>;

const importMetaEnv: ImportMetaEnvMock = {
  VITE_API_URL: 'http://localhost:3000',
  VITE_WS_URL: 'ws://localhost:3000',
  MODE: 'test',
  DEV: false,
  PROD: false,
  SSR: false,
};

(globalThis as typeof globalThis & { importMetaEnv: ImportMetaEnvMock }).importMetaEnv = importMetaEnv;

// Provide import.meta polyfill
if (typeof (globalThis as unknown as { import?: { meta: { env: ImportMetaEnvMock } } }).import === 'undefined') {
  (globalThis as unknown as { import: { meta: { env: ImportMetaEnvMock } } }).import = { meta: { env: importMetaEnv } };
}

// Polyfill TextEncoder/TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Polyfill fetch for Node.js environment if not available
if (typeof global.fetch === 'undefined') {
  const mockFetch: typeof fetch = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as Response)

  global.fetch = mockFetch
}

// Polyfill Response for Node.js environment
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    ok = true;
    status = 200;
    body: unknown;

    constructor(body?: unknown, init?: { status?: number }) {
      this.body = body;
      if (init?.status) {
        this.status = init.status;
        this.ok = init.status >= 200 && init.status < 300;
      }
    }

    json() {
      return Promise.resolve(this.body);
    }

    text() {
      const val = this.body;
      if (typeof val === 'string') { return Promise.resolve(val); }
      if (val === null || val === undefined) { return Promise.resolve(''); }
      try {
        return Promise.resolve(JSON.stringify(val));
      } catch {
        return Promise.resolve('');
      }
    }
  } as unknown as typeof Response;
}

// Polyfill Request for Node.js environment
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;

    constructor(input: string, init?: { method?: string }) {
      this.url = input;
      this.method = init?.method ?? 'GET';
    }
  } as unknown as typeof Request;
}

// Mock window.matchMedia (used by some UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver (used for lazy loading, animations)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver (used by some chart/responsive components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Mock BroadcastChannel (used for cross-tab communication)
global.BroadcastChannel = class BroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(_message: unknown) {}
  close() {}
  addEventListener(_type: string, _listener: EventListener) {}
  removeEventListener(_type: string, _listener: EventListener) {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
} as unknown as typeof BroadcastChannel;

// Mock WritableStream for Node.js environment
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = class WritableStream {
    constructor() {}
    abort() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    getWriter() {
      return {
        write: () => Promise.resolve(),
        close: () => Promise.resolve(),
        abort: () => Promise.resolve(),
        releaseLock: () => {},
      };
    }
  } as unknown as typeof WritableStream;
}

// Mock ReadableStream for Node.js environment
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() {}
    cancel() { return Promise.resolve(); }
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        cancel: () => Promise.resolve(),
        releaseLock: () => {},
      };
    }
  } as unknown as typeof ReadableStream;
}

// Mock WebSocket for Node.js environment
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class WebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url: string;
    readyState = 0;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      // Simulate connection
      setTimeout(() => {
        this.readyState = 1;
        this.onopen?.({} as Event);
      }, 0);
    }

    send(_data: unknown) {}
    close() {
      this.readyState = 3;
      this.onclose?.({} as CloseEvent);
    }
    addEventListener(_type: string, _listener: EventListener) {}
    removeEventListener(_type: string, _listener: EventListener) {}
  } as unknown as typeof WebSocket;
}

// Suppress console errors in tests (optional, remove if you want to see them)
const originalError = console.error
type ConsoleArgs = ReadonlyArray<unknown>

beforeAll(() => {
  console.error = (...args: ConsoleArgs) => {
    const [first] = args
    if (
      typeof first === 'string' &&
      (first.includes('Warning: ReactDOM.render') ||
        first.includes('Warning: useLayoutEffect') ||
        first.includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError(...(args as Parameters<typeof originalError>))
  }
})

afterAll(() => {
  console.error = originalError
})
