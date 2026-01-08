interface URLPatternOptions {
  ignoreCase?: boolean;
}

declare class URLPattern {
  constructor(input: string, baseURLOrOptions?: string | URLPatternOptions);
  test(input: string, baseURL?: string): boolean;
}

declare module 'urlpattern-polyfill';
