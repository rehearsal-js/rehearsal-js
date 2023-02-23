/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Package } from '@rehearsal/migration-graph-shared';
import type { EmberAddonPackage } from './entities/ember-addon-package.js';
import type { EmberAppPackage } from './entities/ember-app-package.js';

export type EmberProjectPackage = Package | EmberAddonPackage | EmberAppPackage;
