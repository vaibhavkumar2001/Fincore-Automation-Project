import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('the API base url is set', async () => {
  // The apiClient fixture already creates the request context with the configured base URL
});

When('I send a GET request to {string}', async ({ apiClient }, path: string) => {
  await apiClient.get(path);
});

Then('the response status should be {int}', async ({ apiClient }, status: number) => {
  await apiClient.expectStatus(status);
});

Then('the response body should contain {string}', async ({ apiClient }, key: string) => {
  await apiClient.expectBodyToContain(key);
});

Then('the response field {string} should equal {string}', async ({ apiClient }, field: string, value: string) => {
  await apiClient.expectFieldToEqual(field, value);
});