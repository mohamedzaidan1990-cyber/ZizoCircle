export type ActionState = {
  error?: string;
  success?: string;
} | null;

export const initialActionState: ActionState = null;

export function failure(message: string): ActionState {
  return { error: message };
}

export function ok(message?: string): ActionState {
  return { success: message ?? "Saved" };
}
