module.exports = {
  create: function () { return this; },
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn((url, body) => {
    // Simple behavior for auth login
    if (url && url.endsWith('/auth/login')) {
      return Promise.resolve({ data: { access_token: 'fake-token' } });
    }
    return Promise.resolve({ data: {} });
  }),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};
