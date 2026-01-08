import { z } from "zod";

export const registerSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone must be at most 15 digits")
    .regex(/^[0-9+]+$/, "Phone must contain only numbers"),

  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),

  email: z.string().email("Invalid email format").optional(),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  phone: z.string().min(10, "Phone must be at least 10 digits"),

  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
