/* eslint-disable @typescript-eslint/no-explicit-any */
import { Package } from './package';

export type AddonName = string;
export type AddonLocation = string;
export type MappingsByAddonName = { [key: AddonName]: Package };
export type MappingsByLocation = { [key: AddonLocation]: Package };

export type MappingsLookup = {
  mappingsByAddonName: MappingsByAddonName;
  mappingsByLocation: MappingsByLocation;
};

export type ExternalAddonPackages = MappingsLookup;

export interface InternalState {
  addonPackages: any;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: any;
}

export class InternalState implements InternalState {
  name: any;
  moduleName: any;
  emberAddonName: any;
  packageMain: any;
  packageMainAST: any;
  externalAddonPackages: ExternalAddonPackages;
  internalAddonPackages: any | undefined;

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
