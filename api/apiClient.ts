import { expect, APIRequestContext, APIResponse } from '@playwright/test';

type Headers = Record<string, string>;

export class ApiClient {
  private lastResponse?: APIResponse;
  private lastResponseBody: unknown;

  constructor(private readonly request: APIRequestContext) {}

  async get(path: string, headers?: Headers) {
    return this.send('GET', path, undefined, headers);
  }

  async post(path: string, payload?: Record<string, unknown>, headers?: Headers) {
    return this.send('POST', path, payload, headers);
  }

  async put(path: string, payload?: Record<string, unknown>, headers?: Headers) {
    return this.send('PUT', path, payload, headers);
  }

  async patch(path: string, payload?: Record<string, unknown>, headers?: Headers) {
    return this.send('PATCH', path, payload, headers);
  }

  async delete(path: string, headers?: Headers) {
    return this.send('DELETE', path, undefined, headers);
  }

  get response() {
    return this.lastResponse;
  }

  get body() {
    return this.lastResponseBody;
  }

  // Typed access to the last response body
  bodyAs<T>(): T {
    return this.lastResponseBody as T;
  }

  async expectStatus(statusCode: number) {
    expect(this.lastResponse?.status()).toBe(statusCode);
  }

  async expectBodyToContain(key: string) {
    expect(this.lastResponseBody as Record<string, unknown>).toHaveProperty(key);
  }

  async expectFieldToEqual(field: string, value: string) {
    expect((this.lastResponseBody as Record<string, unknown>)[field]).toBe(value);
  }

  async expectHeader(name: string, value: string) {
    expect(this.lastResponse?.headers()[name.toLowerCase()]).toBe(value);
  }

  private async send(method: string, path: string, payload?: Record<string, unknown>, headers?: Headers) {
    const response = await this.request.fetch(path, {
      method,
      data: payload,
      headers,
    });

    this.lastResponse = response;
    this.lastResponseBody = await this.parseBody(response);

    return response;
  }

  private async parseBody(response: APIResponse) {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }
}