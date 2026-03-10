/**
 * TypeScript to JSON Schema Converter
 * Converts TypeScript types to JSON Schema for OpenAPI documentation
 */

import ts from 'typescript';
import type { SchemaObject, TypeScriptType, PropertyType } from './types.js';

export class TypeSchemaGenerator {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private typeCache: Map<ts.Type, SchemaObject> = new Map();

  constructor(filePaths: string[]) {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
    };

    this.program = ts.createProgram(filePaths, compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  /**
   * Generate JSON Schema from a TypeScript type name
   */
  generateSchemaFromTypeName(typeName: string): SchemaObject {
    const sourceFile = this.program.getSourceFiles().find(f =>
      f.statements.some(s =>
        ts.isInterfaceDeclaration(s) && s.name.text === typeName ||
        ts.isTypeAliasDeclaration(s) && s.name.text === typeName
      )
    );

    if (!sourceFile) {
      throw new Error(`Type ${typeName} not found in source files`);
    }

    let typeNode: ts.Node | undefined;
    for (const stmt of sourceFile.statements) {
      if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === typeName) {
        typeNode = stmt;
        break;
      }
      if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === typeName) {
        typeNode = stmt;
        break;
      }
    }

    if (!typeNode) {
      throw new Error(`Type ${typeName} declaration not found`);
    }

    const type = this.checker.getTypeAtLocation(typeNode);
    return this.convertTypeToSchema(type);
  }

  /**
   * Convert a TypeScript type to JSON Schema
   */
  convertTypeToSchema(type: ts.Type): SchemaObject {
    // Check cache first
    if (this.typeCache.has(type)) {
      return this.typeCache.get(type)!;
    }

    const schema = this.doConvertTypeToSchema(type);
    this.typeCache.set(type, schema);
    return schema;
  }

  /**
   * Internal conversion logic
   */
  private doConvertTypeToSchema(type: ts.Type): SchemaObject {
    // Handle primitive types
    if (type.flags & ts.TypeFlags.String) {
      return { type: 'string' };
    }
    if (type.flags & ts.TypeFlags.Number) {
      return { type: 'number' };
    }
    if (type.flags & ts.TypeFlags.Boolean) {
      return { type: 'boolean' };
    }
    if (type.flags & ts.TypeFlags.Null) {
      return { type: 'null' };
    }
    if (type.flags & ts.TypeFlags.Undefined) {
      return { type: 'null' };
    }
    if (type.flags & ts.TypeFlags.Any) {
      return {};
    }
    if (type.flags & ts.TypeFlags.Unknown) {
      return {};
    }
    if (type.flags & ts.TypeFlags.Void) {
      return { type: 'null' };
    }

    // Handle array types
    if (type.flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;

      // Check for array
      if (objectType.objectFlags & ts.ObjectFlags.Array) {
        const arrayType = type as ts.TypeReference;
        const typeArgs = arrayType.typeArguments ?? [];
        const itemType = typeArgs[0];
        return {
          type: 'array',
          items: itemType ? this.convertTypeToSchema(itemType) : {},
        };
      }

      // Check for tuple
      if (objectType.objectFlags & ts.ObjectFlags.Tuple) {
        const tupleType = type as ts.TupleTypeReference;
        const elementTypes = tupleType.target.elementTypes ?? [];
        return {
          type: 'array',
          items: elementTypes.map(t => this.convertTypeToSchema(t)),
          minItems: elementTypes.length,
          maxItems: elementTypes.length,
        };
      }

      // Check for interface/type literal
      if (objectType.objectFlags & (ts.ObjectFlags.Interface | ts.ObjectFlags.Class)) {
        const props = this.getProperties(type);
        return {
          type: 'object',
          properties: Object.fromEntries(
            props.map(p => [p.name, this.convertTypeToSchema(p.type)])
          ),
          required: props.filter(p => !p.optional).map(p => p.name),
        };
      }

      // Check for literal types
      if (objectType.objectFlags & ts.ObjectFlags.StringLiteral) {
        return { type: 'string', const: (type as ts.StringLiteralType).value };
      }
      if (objectType.objectFlags & ts.ObjectFlags.NumberLiteral) {
        return { type: 'number', const: (type as ts.NumberLiteralType).value };
      }
      if (objectType.objectFlags & ts.ObjectFlags.BooleanLiteral) {
        return {
          type: 'boolean',
          const: type === this.checker.getTrueType() ? true : false,
        };
      }
    }

    // Handle union types
    if (type.isUnion()) {
      const types = type.types.map(t => this.convertTypeToSchema(t));
      // Check if this is an optional type (T | undefined)
      const hasUndefined = types.some(s => s.type === 'null' || s.type === 'undefined');
      if (hasUndefined && types.length === 2) {
        const actualType = types.find(s => s.type !== 'null' && s.type !== 'undefined');
        return actualType ?? {};
      }
      return { oneOf: types };
    }

    // Handle intersection types
    if (type.isIntersection()) {
      const types = type.types.map(t => this.convertTypeToSchema(t));
      return { allOf: types };
    }

    // Handle type references
    if (type.aliasSymbol) {
      const aliasDecl = type.aliasSymbol.declarations?.[0];
      if (aliasDecl && ts.isTypeAliasDeclaration(aliasDecl)) {
        return this.convertNodeToSchema(aliasDecl.type);
      }
    }

    // Handle enum types
    if (type.flags & ts.TypeFlags.Enum) {
      const enumType = type as ts.EnumType;
      const members: string[] = [];
      enumType.types.forEach(t => {
        if (ts.isLiteralType(t)) {
          members.push(String(t.literal.value));
        }
      });
      return {
        type: 'string',
        enum: members,
      };
    }

    // Default: empty schema
    return {};
  }

  /**
   * Convert a TypeScript type node to JSON Schema
   */
  private convertNodeToSchema(node: ts.TypeNode): SchemaObject {
    if (ts.isKeywordTypeNode(node)) {
      switch (node.kind) {
        case ts.SyntaxKind.StringKeyword:
          return { type: 'string' };
        case ts.SyntaxKind.NumberKeyword:
          return { type: 'number' };
        case ts.SyntaxKind.BooleanKeyword:
          return { type: 'boolean' };
        case ts.SyntaxKind.NullKeyword:
          return { type: 'null' };
        case ts.SyntaxKind.VoidKeyword:
          return { type: 'null' };
        case ts.SyntaxKind.AnyKeyword:
        case ts.SyntaxKind.UnknownKeyword:
          return {};
        default:
          return {};
      }
    }

    if (ts.isArrayTypeNode(node)) {
      return {
        type: 'array',
        items: this.convertNodeToSchema(node.elementType),
      };
    }

    if (ts.isTupleTypeNode(node)) {
      return {
        type: 'array',
        items: node.elements.map(e => this.convertNodeToSchema(e)),
        minItems: node.elements.length,
        maxItems: node.elements.length,
      };
    }

    if (ts.isUnionTypeNode(node)) {
      return {
        oneOf: node.types.map(t => this.convertNodeToSchema(t)),
      };
    }

    if (ts.isIntersectionTypeNode(node)) {
      return {
        allOf: node.types.map(t => this.convertNodeToSchema(t)),
      };
    }

    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText();
      return { $ref: `#/components/schemas/${typeName}` };
    }

    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal)) {
        return { type: 'string', const: node.literal.text };
      }
      if (node.literal.kind === ts.SyntaxKind.NumericLiteral) {
        return { type: 'number', const: Number(node.literal.text) };
      }
      if (node.literal.kind === ts.SyntaxKind.TrueKeyword) {
        return { type: 'boolean', const: true };
      }
      if (node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return { type: 'boolean', const: false };
      }
    }

    if (ts.isTypeLiteralNode(node)) {
      const properties: { [key: string]: SchemaObject } = {};
      const required: string[] = [];

      for (const member of node.members) {
        if (ts.isPropertySignature(member)) {
          const name = member.name?.getText() ?? '';
          properties[name] = this.convertNodeToSchema(member.type!);
          if (!member.questionToken) {
            required.push(name);
          }
        }
      }

      return { type: 'object', properties, required: required.length > 0 ? required : undefined };
    }

    return {};
  }

  /**
   * Get properties from a type
   */
  private getProperties(type: ts.Type): Array<{ name: string; type: ts.Type; optional: boolean }> {
    const props: Array<{ name: string; type: ts.Type; optional: boolean }> = [];

    const addProperty = (name: string, propType: ts.Type, optional: boolean) => {
      props.push({ name, type: propType, optional });
    };

    // Get properties from the type
    const properties = this.checker.getPropertiesOfType(type);
    for (const prop of properties) {
      const propType = this.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
      const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
      addProperty(prop.getName(), propType, isOptional);
    }

    // Get index signature if present
    const indexInfo = this.checker.getIndexInfoOfType(type, ts.IndexKind.String);
    if (indexInfo) {
      props.push({
        name: '[key: string]',
        type: indexInfo.type,
        optional: true,
      });
    }

    return props;
  }

  /**
   * Extract TypeScript type information from a source file
   */
  extractTypes(sourceFile: string): TypeScriptType[] {
    const types: TypeScriptType[] = [];
    const source = this.program.getSourceFile(sourceFile);

    if (!source) {
      return types;
    }

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        types.push(this.extractInterfaceType(node));
      } else if (ts.isTypeAliasDeclaration(node)) {
        types.push(this.extractAliasType(node));
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
    return types;
  }

  /**
   * Extract interface type information
   */
  private extractInterfaceType(node: ts.InterfaceDeclaration): TypeScriptType {
    const properties: PropertyType[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const name = member.name?.getText() ?? '';
        const type = this.checker.getTypeAtLocation(member.type!);
        properties.push({
          name,
          type: this.getTypeScriptType(type),
          optional: !!member.questionToken,
          readonly: false,
        });
      }
    }

    return {
      name: node.name.text,
      kind: 'interface',
      properties,
    };
  }

  /**
   * Extract type alias information
   */
  private extractAliasType(node: ts.TypeAliasDeclaration): TypeScriptType {
    const type = this.checker.getTypeAtLocation(node);
    return this.getTypeScriptType(type);
  }

  /**
   * Get TypeScript type representation
   */
  private getTypeScriptType(type: ts.Type): TypeScriptType {
    if (type.flags & ts.TypeFlags.String) {
      return { name: 'string', kind: 'primitive' };
    }
    if (type.flags & ts.TypeFlags.Number) {
      return { name: 'number', kind: 'primitive' };
    }
    if (type.flags & ts.TypeFlags.Boolean) {
      return { name: 'boolean', kind: 'primitive' };
    }

    const objectType = type as ts.ObjectType;
    if (objectType.objectFlags & ts.ObjectFlags.Array) {
      const arrayType = type as ts.TypeReference;
      const typeArgs = arrayType.typeArguments ?? [];
      return {
        name: 'Array',
        kind: 'array',
        typeParameters: typeArgs.map(t => this.getTypeScriptType(t)),
      };
    }

    if (type.isUnion()) {
      return {
        name: 'Union',
        kind: 'union',
        types: type.types.map(t => this.getTypeScriptType(t)),
      };
    }

    return {
      name: this.checker.typeToString(type),
      kind: 'type',
    };
  }

  /**
   * Generate validation schema for a TypeScript type
   */
  generateValidationSchema(typeName: string): SchemaObject {
    const schema = this.generateSchemaFromTypeName(typeName);

    // Add validation metadata
    return {
      ...schema,
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `https://polln.ai/schemas/${typeName}.json`,
    };
  }
}
