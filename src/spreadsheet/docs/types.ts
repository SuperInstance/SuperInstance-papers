/**
 * OpenAPI 3.1 and AsyncAPI 2.0 Type Definitions
 * For POLLN Spreadsheet API Documentation Generator
 */

// ============================================================================
// OpenAPI 3.1 Types
// ============================================================================

export interface OpenAPIDocument {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathsObject;
  components?: ComponentsObject;
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

export interface InfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: { [key: string]: ServerVariableObject };
}

export interface ServerVariableObject {
  enum?: string[];
  default: string;
  description?: string;
}

export interface PathsObject {
  [pattern: string]: PathItemObject;
}

export interface PathItemObject {
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: ParameterObject[];
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: ResponsesObject;
  callbacks?: CallbacksObject;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
}

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema: SchemaObject;
  example?: any;
  examples?: { [key: string]: ExampleObject };
  content?: { [key: string]: MediaTypeObject };
}

export interface RequestBodyObject {
  description?: string;
  content: { [key: string]: MediaTypeObject };
  required?: boolean;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
  example?: any;
  examples?: { [key: string]: ExampleObject };
  encoding?: { [key: string]: EncodingObject };
}

export interface EncodingObject {
  contentType?: string;
  headers?: { [key: string]: HeaderObject };
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface ResponsesObject {
  [code: string]: ResponseObject;
}

export interface ResponseObject {
  description: string;
  headers?: { [key: string]: HeaderObject };
  content?: { [key: string]: MediaTypeObject };
  links?: { [key: string]: LinkObject };
}

export interface LinkObject {
  operationRef?: string;
  operationId?: string;
  parameters?: { [key: string]: any };
  requestBody?: any;
  description?: string;
  server?: ServerObject;
}

export interface CallbacksObject {
  [key: string]: CallbackObject;
}

export interface CallbackObject {
  [key: string]: PathItemObject;
}

export interface ComponentsObject {
  schemas?: { [key: string]: SchemaObject };
  responses?: { [key: string]: ResponseObject };
  parameters?: { [key: string]: ParameterObject };
  examples?: { [key: string]: ExampleObject };
  requestBodies?: { [key: string]: RequestBodyObject };
  headers?: { [key: string]: HeaderObject };
  securitySchemes?: { [key: string]: SecuritySchemeObject };
  links?: { [key: string]: LinkObject };
  callbacks?: { [key: string]: CallbackObject };
  pathItems?: { [key: string]: PathItemObject };
}

export interface SchemaObject {
  type?: string | string[];
  title?: string;
  description?: string;
  format?: string;
  default?: any;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  const?: any;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  not?: SchemaObject;
  items?: SchemaObject | SchemaObject[];
  additionalProperties?: boolean | SchemaObject;
  properties?: { [key: string]: SchemaObject };
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XMLObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  deprecated?: boolean;
  $schema?: string;
  $id?: string;
  $ref?: string;
  $comment?: string;
  discriminator?: DiscriminatorObject;
}

export interface XMLObject {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: { [key: string]: string };
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface HeaderObject {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema: SchemaObject;
  example?: any;
  examples?: { [key: string]: ExampleObject };
  content?: { [key: string]: MediaTypeObject };
}

export interface SecuritySchemeObject {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlowsObject;
  openIdConnectUrl?: string;
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: { [key: string]: string };
}

export interface SecurityRequirementObject {
  [name: string]: string[];
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

// ============================================================================
// AsyncAPI 2.0 Types (for WebSocket)
// ============================================================================

export interface AsyncAPIDocument {
  asyncapi: string;
  info: AsyncInfoObject;
  servers?: { [key: string]: AsyncServerObject };
  channels: ChannelsObject;
  components?: AsyncComponentsObject;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

export interface AsyncInfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
}

export interface AsyncServerObject {
  url: string;
  protocol: string;
  protocolVersion?: string;
  description?: string;
  variables?: { [key: string]: AsyncServerVariableObject };
  security?: any[];
  bindings?: any;
}

export interface AsyncServerVariableObject {
  enum?: any[];
  default: any;
  description?: string;
  examples?: any[];
}

export interface ChannelsObject {
  [channelName: string]: ChannelItemObject;
}

export interface ChannelItemObject {
  description?: string;
  publish?: OperationObject;
  subscribe?: OperationObject;
  parameters?: { [key: string]: ParameterObject };
  bindings?: any;
}

export interface AsyncComponentsObject {
  schemas?: { [key: string]: SchemaObject };
  messages?: { [key: string]: MessageObject };
  securitySchemes?: { [key: string]: SecuritySchemeObject };
  parameters?: { [key: string]: ParameterObject };
  correlationIds?: { [key: string]: CorrelationIdObject };
  serverVariables?: { [key: string]: AsyncServerVariableObject };
  operationTraits?: any[];
  messageTraits?: any[];
  operationBindings?: any;
  messageBindings?: any;
  serverBindings?: any;
  channelBindings?: any;
}

export interface MessageObject {
  headers?: SchemaObject;
  payload?: SchemaObject;
  correlationId?: CorrelationIdObject;
  schemaFormat?: string;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  examples?: any[];
  tags?: TagObject[];
  bindings?: any;
}

export interface CorrelationIdObject {
  description?: string;
  location: string;
}

// ============================================================================
// Documentation Generation Types
// ============================================================================

export interface DocConfig {
  title: string;
  version: string;
  description: string;
  servers: ServerObject[];
  tags: TagObject[];
  securitySchemes: { [key: string]: SecuritySchemeObject };
}

export interface EndpointConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';
  summary: string;
  description: string;
  tags: string[];
  parameters?: ParameterConfig[];
  requestBody?: RequestConfig;
  responses: ResponseConfig[];
  security?: SecurityRequirementObject[];
  deprecated?: boolean;
}

export interface ParameterConfig {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required: boolean;
  schema: SchemaObject | string;
  example?: any;
}

export interface RequestConfig {
  description: string;
  contentType: string;
  schema: SchemaObject | string;
  example?: any;
}

export interface ResponseConfig {
  code: string;
  description: string;
  contentType: string;
  schema: SchemaObject | string;
  example?: any;
  headers?: { [key: string]: HeaderConfig };
}

export interface HeaderConfig {
  description: string;
  schema: SchemaObject | string;
  required?: boolean;
}

export interface WebSocketEventConfig {
  channel: string;
  direction: 'publish' | 'subscribe';
  summary: string;
  description: string;
  message: MessageConfig;
}

export interface MessageConfig {
  name: string;
  title?: string;
  summary?: string;
  description?: string;
  payload: SchemaObject | string;
  headers?: SchemaObject | string;
  examples?: any[];
  correlationId?: string;
}

export interface JSDocComment {
  description: string;
  tags: JSDocTag[];
  deprecated?: boolean;
  since?: string;
  see?: string[];
}

export interface JSDocTag {
  tag: string;
  name?: string;
  type?: string;
  description?: string;
}

export interface TypeScriptType {
  name: string;
  kind: 'primitive' | 'array' | 'object' | 'union' | 'intersection' | 'enum' | 'interface' | 'type';
  properties?: PropertyType[];
  indexSignature?: PropertyType;
  typeParameters?: TypeScriptType[];
  types?: TypeScriptType[];
  enumValues?: string[];
  extends?: TypeScriptType;
  implements?: TypeScriptType[];
}

export interface PropertyType {
  name: string;
  type: TypeScriptType;
  optional: boolean;
  readonly: boolean;
  description?: string;
}

export interface CodeExample {
  language: 'javascript' | 'python' | 'curl' | 'typescript' | 'websocket';
  title: string;
  description?: string;
  code: string;
}

export interface DocTemplate {
  html: string;
  markdown: string;
  variables: { [key: string]: string };
}

export interface GeneratedDocumentation {
  openapi: OpenAPIDocument;
  asyncapi: AsyncAPIDocument;
  examples: CodeExample[];
  templates: DocTemplate[];
  timestamp: string;
  version: string;
}
