import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { EmberPackage } from './ember-package';

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

import { InternalState } from './InternalState';
import { PackageOptions } from './package';

export class EmberAddonPackage extends EmberPackage {
  isAddon: boolean;

  constructor(pathToPackage: string, options: PackageOptions = {}) {
    super(pathToPackage, options);
    this.isAddon = true;
  }

  get isEngine() {
    return isEngine(this.path);
  }

  /**
   * The name should be the value from packageJson,
   * which is retrieved by Package.name
   */
  get name() {
    if (!this.internalState.name) {
      this.internalState.name = getNameFromMain(this.path);
    }
    return this.internalState.name;
  }

  // return the value of the field in the main
  get moduleName() {
    if (!this.internalState.moduleName) {
      this.internalState.moduleName = getModuleNameFromMain(this.path);
    }
    return this.internalState.moduleName;
  }

  get emberAddonName() {
    if (!this.internalState.emberAddonName) {
      this.internalState.emberAddonName = getEmberAddonName(this.path);
    }
    return this.internalState.emberAddonName;
  }

  get packageMain() {
    if (!this.internalState.packageMain) {
      this.internalState.packageMain = getPackageMainFileName(this.path);
    }
    return this.internalState.packageMain;
  }

  getPackageMainAST() {
    if (!this.internalState.packageMainAST) {
      this.internalState.packageMainAST = getPackageMainAST(this.path, this.packageMain);
    }
    return this.internalState.packageMainAST;
  }

  /**
   * Set the name property for the addon in the package main.
   */
  setAddonName(addonName: string) {
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
  setModuleName(moduleName: string) {
    traverse(this.getPackageMainAST(), {
      AssignmentExpression({ node }) {
        const configurationObject = getPackageMainExportConfigFromASTNode(node);
        // const moduleNameFunc = parser.parse(`() => '${moduleName}'`);
        // const expressionStatment = (moduleNameFunc.program.body[0]) as ExpressionStatement;
        // const someExpression = expressionStatment.expression;
        // configurationObject?.properties?.push(
        //   t.objectProperty(
        //     t.identifier('moduleName'),
        //     someExpression
        //   )
        // );

        // // TODO: Need to validate this

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
  removeModuleName() {
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

  writePackageMainToDisk() {
    writePackageMain(this.path, this.getPackageMainAST(), this.packageMain);

    // reset the internal state
    this.internalState = new InternalState();
  }
}
