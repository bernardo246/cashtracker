import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z.string().min(8).max(128);

export const registerInput = z.strictObject({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
});
export const loginInput = z.strictObject({ email: emailSchema, password: z.string().min(1) });
export const forgotPasswordInput = z.strictObject({ email: emailSchema });
export const resetPasswordInput = z.strictObject({ token: z.string().min(20), password: passwordSchema });
export const updateMeInput = z.strictObject({ name: z.string().trim().min(1).max(80) });

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
export type UpdateMeInput = z.infer<typeof updateMeInput>;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
}
export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}
