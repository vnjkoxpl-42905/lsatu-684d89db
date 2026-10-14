import { z } from 'zod';

export const UuidV4Schema = z.string().uuid();
export const IsoDateSchema = z.string().datetime();

export const newId = (): string => crypto.randomUUID();
export const now = (): string => new Date().toISOString();
