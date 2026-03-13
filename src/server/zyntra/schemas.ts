import { z } from "zod";

export const SignalIngestSchema = z.object({
    patientId: z.string().min(1),
    source: z.enum(["CGM", "WEARABLE", "MANUAL", "SYSTEM"]),
    ts: z.string().datetime(),
    type: z.string().min(2).max(64),
    value: z.number().optional(),
    unit: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
});

export type SignalIngestInput = z.infer<typeof SignalIngestSchema>;

export const RiskRequestSchema = z.object({
    patientId: z.string().min(1),
});

export type RiskRequestInput = z.infer<typeof RiskRequestSchema>;
