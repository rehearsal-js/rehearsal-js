import { z } from 'zod';

const PackageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
  scripts: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  workspaces: z.array(z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  'ember-addon': z.object({ paths: z.array(z.string()) }).optional(),
});

export const PackageJson = PackageJsonSchema;
