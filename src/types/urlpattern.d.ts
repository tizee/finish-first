interface URLPatternOptions {
  ignoreCase?: boolean;
}

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

declare class URLPattern {
  constructor(input: string | URLPatternInit, baseURLOrOptions?: string | URLPatternOptions);
  test(input: string | URLPatternInit, baseURL?: string): boolean;
}
