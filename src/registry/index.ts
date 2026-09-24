import data from './components.json' with { type: 'json' };
import { registrySchema } from './schema.js';

export const registry = registrySchema.parse(data);
export const metadata = registry.index;
