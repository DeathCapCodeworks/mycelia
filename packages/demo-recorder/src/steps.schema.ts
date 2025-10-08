import { z } from 'zod';

export const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), selector: z.string().min(1) }),
  z.object({ type: z.literal('waitFor'), ms: z.number().int().positive() })
]);

export const Step = z.object({
  route: z.string().min(1),
  caption: z.string().min(1),
  actions: z.array(Action).min(1)
});

export const StepsDoc = z.object({
  version: z.number().int().positive(),
  steps: z.array(Step).min(1)
});

export type TStepsDoc = z.infer<typeof StepsDoc>;
