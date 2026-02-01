// Setup for React Testing Library + global mocks
import '@testing-library/jest-dom/extend-expect';

// Ensure axios is mocked for tests to avoid ESM import issues
jest.mock('axios', () => require('./__mocks__/axios.js'));
