export const Alert = { alert: jest.fn() };
export const Platform = { OS: 'android', select: jest.fn((obj: any) => obj.android) };
export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
};
export default { Alert, Platform, Dimensions };
