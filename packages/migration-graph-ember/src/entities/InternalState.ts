/* eslint-disable @typescript-eslint/no-explicit-any */
import { Package } from '@rehearsal/migration-graph-shared';

export type AddonName = string;
export type AddonLocation = string;
export type MappingsByAddonName = Record<AddonName, Package>;
export type MappingsByLocation = Record<AddonLocation, Package>;

export type MappingsLookup = {
  mappingsByAddonName: MappingsByAddonName;
  mappingsByLocation: MappingsByLocation;
};

export type ExternalPackages = MappingsLookup;
export type ExternalAddonPackages = MappingsLookup;

export type InternalPackages = MappingsLookup;
export type InternalAddonPackages = MappingsLookup;

export interface InternalState {
  addonPackages: any;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: InternalAddonPackages;
}

export class InternalState implements InternalState {
  name: any;
  moduleName: any;
  emberAddonName: any;
  packageMain: any;
  packageMainAST: any;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: InternalAddonPackages;

  constructor() {
    this.addonPackages = {};
    this.externalAddonPackages = {
      mappingsByAddonName: {},
      mappingsByLocation: {},
    };
  }

  reset(): void {
    this.name = undefined;
    this.moduleName = undefined;
    this.emberAddonName = undefined;
    this.packageMain = undefined;
    this.packageMainAST = undefined;
    this.addonPackages = {};
    this.externalAddonPackages = {
      mappingsByAddonName: {},
      mappingsByLocation: {},
    };
  }
}

export class RootInternalState extends InternalState {
  rootPackage: Package;

  constructor(rootPackage: Package) {
    super();
    this.rootPackage = rootPackage;
  }
}
