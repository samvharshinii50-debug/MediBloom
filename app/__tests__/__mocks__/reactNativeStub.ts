/** Just enough React Native surface for the service modules under test. */
export const Platform = { OS: 'android' as const, select: (o: Record<string, unknown>) => o.android };
export const StyleSheet = { create: <T>(s: T): T => s };
export const Alert = { alert: () => {} };
