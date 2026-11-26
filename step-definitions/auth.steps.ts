import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures';
import { buildUser } from '../data/userFactory';

const { Given, When } = createBdd(test);

Given('a registered user exists', async ({ apiClient, ctx }) => {
  const user = buildUser();
  ctx.username = user.username;
  ctx.password = user.password;

  await apiClient.post('/auth/register', user);
  await apiClient.expectStatus(201);
});

// Registers a fresh user, logs in, and attaches the token to every later request
Given('I am logged in as a new user', async ({ apiClient, ctx }) => {
  const user = buildUser();
  ctx.username = user.username;
  ctx.password = user.password;

  await apiClient.post('/auth/register', user);
  await apiClient.expectStatus(201);

  await apiClient.post('/auth/login', user);
  await apiClient.expectStatus(200);

  const { token } = apiClient.bodyAs<{ token: string }>();
  apiClient.setHeader('Authorization', `Bearer ${token}`);
});

Given('I use the token {string}', async ({ apiClient }, token: string) => {
  apiClient.setHeader('Authorization', `Bearer ${token}`);
});

When('I log in with the correct password', async ({ apiClient, ctx }) => {
  await apiClient.post('/auth/login', { username: ctx.username!, password: ctx.password! });
});

When('I log in with a wrong password', async ({ apiClient, ctx }) => {
  await apiClient.post('/auth/login', { username: ctx.username!, password: 'WrongPassword!1' });
});