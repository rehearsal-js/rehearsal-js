/* eslint-disable @typescript-eslint/no-explicit-any */
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { readPackageJson } from '@rehearsal/migration-graph-shared';

import {
  getEmberAddonName,
  getModuleNameFromMain,
  getNameFromMain,
  getPackageMainAST,
  getPackageMainExportConfigFromASTNode,
  getPackageMainFileName,
  isEngine,
  writePackageMain,
} from '../utils/ember';
import { type EmberPackageOptions, EmberAppPackage } from './ember-app-package';
import { InternalState } from './InternalState';

export class EmberAddonPackage extends EmberAppPackage {
  isAddon: boolean;

  constructor(pathToPackage: string, options: EmberPackageOptions = {}) {
    super(pathToPackage, options);
    this.isAddon = true;
  }

  get isEngine(): boolean {
    return isEngine(readPackageJson(this.path));
  }

  get excludePatterns(): Array<string> {
    // TODO Determine ember-config from package.json entry
    return [
      'dist',
      'config',
      'ember-config',
      'tests',
      'test-addon',
      '@ember/*',
      'public',
      './package',
    ];
  }

  get includePatterns(): Array<string> {
    // TODO Determine ember-config from package.json entry
    return ['index.js', 'addon/', 'app/'];
  }

  /**
   * The name should be the value from packageJson,
   * which is retrieved by Package.name
   */
  get name(): any {
    if (!this.internalState.name) {
      this.internalState.name = getNameFromMain(this.path);
    }
    return this.internalState.name;
  }

  // return the value of the field in the main
  get moduleName(): any {
    if (!this.internalState.moduleName) {
      this.internalState.moduleName = getModuleNameFromMain(this.path);
    }
    return this.internalState.moduleName;
  }

  get emberAddonName(): any {
    if (!this.internalState.emberAddonName) {
      this.internalState.emberAddonName = getEmberAddonName(this.path);
    }
    return this.internalState.emberAddonName;
  }

  get packageMain(): any {
    if (!this.internalState.packageMain) {
      this.internalState.packageMain = getPackageMainFileName(this.path);
    }
    return this.internalState.packageMain;
  }

  getPackageMainAST(): any {
    if (!this.internalState.packageMainAST) {
      this.internalState.packageMainAST = getPackageMainAST(this.path, this.packageMain);
    }
    return this.internalState.packageMainAST;
  }

  /**
   * Set the name property for the addon in the package main.
   */
  setAddonName(addonName: string): this {
    traverse(this.getPackageMainAST(), {
      AssignmentExpression: function ({ node }) {
        const configurationObject = getPackageMainExportConfigFromASTNode(node);

        if (configurationObject && configurationObject.properties) {
          configurationObject.properties = configurationObject.properties.filter(
            (p: { key: { name: string } }) => p.key.name !== 'name'
          );
          // remove any existing name property to set the new one
          configurationObject.properties.push(
            t.objectProperty(t.identifier('name'), t.stringLiteral(addonName))
          );
        }
      },
    });
    return this;
  }

  /**
   * The moduleName is used by ember to identify an addon, this can be
   * different from the package.name.
   * The value is returned from a function named "moduleName" that is specified
   * in the "main" entrypoint of the package.
   *
   * This modifies the export of the project main to have a `moduleName` property
   * that is a function that returns the string.
   * The main can export an object or function that returns an object.
   *
   * Setting the module name requires passing in a function that will be
   * output into the package main, override whatever was there.
   * @param moduleName string for generating thie moduleName function
   * @return instance of EmberAddon
   */
  setModuleName(moduleName: string): this {
    traverse(this.getPackageMainAST(), {
      AssignmentExpression({ node }) {
        const configurationObject = getPackageMainExportConfigFromASTNode(node);
        const moduleNameArrowFunctionExpression = t.arrowFunctionExpression(
          [],
          t.stringLiteral(moduleName)
        );
        configurationObject?.properties?.push(
          t.objectProperty(t.identifier('moduleName'), moduleNameArrowFunctionExpression)
        );
      },
    });
    return this;
  }

  /**
   * Remove the moduleName function from the package main.
   */
  removeModuleName(): this {
    traverse(this.getPackageMainAST(), {
      AssignmentExpression({ node }) {
        const configurationObject = getPackageMainExportConfigFromASTNode(node);
        configurationObject.properties = configurationObject.properties.filter(
          (p: any) => p.key.name !== 'moduleName'
        );
      },
    });
    return this;
  }

  writePackageMainToDisk(): void {
    writePackageMain(this.path, this.getPackageMainAST(), this.packageMain);

    // reset the internal state
    this.internalState = new InternalState();
  }
}
