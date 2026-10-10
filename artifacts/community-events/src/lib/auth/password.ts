import { hash, compare } from "bcryptjs";

export const PASSWORD_COST = 12;
export const hashPassword = (password: string) => hash(password, PASSWORD_COST);
export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash);
