export function proJobReturn(value: unknown): string;
export function comingSoonHref(value: unknown): string;
export const journeyStates: Record<string, { title: string; text: string }>;
export function journeyStateInfo(state: string): {
  title: string;
  text: string;
};
export function offersAppInformation(state: string): boolean;
