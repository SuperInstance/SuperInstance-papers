/**
 * WebGPU Type Declarations
 *
 * Provides TypeScript type definitions for WebGPU API.
 * These types are part of the WebGPU standard and should be available
 * in browsers that support WebGPU.
 */

declare global {
  interface Navigator {
    readonly gpu: GPUSupports | null;
  }

  interface GPUSupports {
    readonly wgslLanguageFeatures: WGSLLanguageFeatures;
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  }

  interface WGSLLanguageFeatures {
    readonly size: number;
    entries(): IterableIterator<WGSLLanguageFeature>;
    keys(): IterableIterator<WGSLLanguageFeature>;
    values(): IterableIterator<WGSLLanguageFeature>;
    has(feature: WGSLLanguageFeature): boolean;
    forEach(
      callbackFn: (feature: WGSLLanguageFeature, index: number, features: WGSLLanguageFeatures) => void,
      thisArg?: any,
    ): void;
    [Symbol.iterator](): IterableIterator<WGSLLanguageFeature>;
  }

  type WGSLLanguageFeature = string;

  interface GPURequestAdapterOptions {
    powerPreference?: GPUPowerPreference;
    forceFallbackAdapter?: boolean;
  }

  type GPUPowerPreference = 'low-power' | 'high-performance';

  interface GPUAdapter {
    readonly features: GPUFeatureName;
    readonly limits: GPUSupportedLimits;
    readonly isFallbackAdapter: boolean;
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    readonly vendor: string;
    readonly architecture: string;
    readonly device: string;
    readonly description: string;
  }

  interface GPUDeviceDescriptor {
    requiredFeatures?: Iterable<GPUFeatureName>;
    requiredLimits?: Record<string, number>;
    defaultQueue?: GPUQueueDescriptor;
    label?: string;
  }

  type GPUFeatureName = string;

  interface GPUSupportedLimits {
    maxTextureDimension1D: number;
    maxTextureDimension2D: number;
    maxTextureDimension3D: number;
    maxTextureArrayLayers: number;
    maxBindGroups: number;
    maxDynamicUniformBuffersPerPipelineLayout: number;
    maxDynamicStorageBuffersPerPipelineLayout: number;
    maxSampledTexturesPerShaderStage: number;
    maxSamplersPerShaderStage: number;
    maxStorageBuffersPerShaderStage: number;
    maxStorageTexturesPerShaderStage: number;
    maxUniformBuffersPerShaderStage: number;
    maxUniformBufferBindingSize: number;
    maxStorageBufferBindingSize: number;
    minUniformBufferOffsetAlignment: number;
    minStorageBufferOffsetAlignment: number;
    maxVertexBuffers: number;
    maxVertexAttributes: number;
    maxVertexBufferArrayStride: number;
    maxInterStageShaderComponents: number;
    maxComputeWorkgroupStorageSize: number;
    maxComputeInvocationsPerWorkgroup: number;
    maxComputeWorkgroupSizeX: number;
    maxComputeWorkgroupSizeY: number;
    maxComputeWorkgroupSizeZ: number;
    maxComputeWorkgroupsPerDimension: number;
    maxBufferSize: number;
  }

  interface GPUQueueDescriptor {
    label?: string;
  }

  class GPUDevice {
    readonly adapter: GPUAdapter;
    readonly features: GPUFeatureName;
    readonly limits: GPUSupportedLimits;
    readonly queue: GPUQueue;
    destroy(): void;
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
    createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createRenderBundleEncoder(descriptor: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder;
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
    createRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
    createComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
    importExternalTexture(descriptor: GPUImportExternalTextureDescriptor): GPUExternalTexture;
    lose(): Promise<undefined>;
    readonly lost: Promise<GPUDeviceLostInfo>;
    pushErrorScope(filter: GPUErrorFilter): void;
    popErrorScope(): Promise<GPUError | null>;
  }

  interface GPUBufferDescriptor {
    size: number;
    usage: GPUBufferUsageFlags;
    mappedAtCreation?: boolean;
    label?: string;
  }

  type GPUBufferUsageFlags = number;
  interface GPUBufferUsage {
    readonly MAP_READ: GPUBufferUsageFlags;
    readonly MAP_WRITE: GPUBufferUsageFlags;
    readonly COPY_SRC: GPUBufferUsageFlags;
    readonly COPY_DST: GPUBufferUsageFlags;
    readonly INDEX: GPUBufferUsageFlags;
    readonly VERTEX: GPUBufferUsageFlags;
    readonly UNIFORM: GPUBufferUsageFlags;
    readonly STORAGE: GPUBufferUsageFlags;
    readonly INDIRECT: GPUBufferUsageFlags;
    readonly QUERY_RESOLVE: GPUBufferUsageFlags;
  }

  var GPUBufferUsage: GPUBufferUsage;

  class GPUBuffer {
    readonly size: number;
    readonly usage: GPUBufferUsageFlags;
    readonly mapState: GPUBufferMapState;
    destroy(): void;
    mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<undefined>;
    getMappedRange(offset?: number, size?: number): ArrayBuffer;
    unmap(): void;
  }

  type GPUBufferMapState = 'unmapped' | 'mapped' | 'mapping pending';

  type GPUMapModeFlags = number;
  interface GPUMapMode {
    readonly READ: GPUMapModeFlags;
    readonly WRITE: GPUMapModeFlags;
  }

  var GPUMapMode: GPUMapMode;

  class GPUQueue {
    submit(commandBuffers: GPUCommandBuffer[]): void;
    onSubmittedWorkDone(): Promise<undefined>;
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
    writeTexture(destination: GPUImageCopyTexture, data: BufferSource, dataLayout: GPUImageDataLayout, size: GPUExtent3D): void;
    copyExternalImageToTexture(source: GPUImageCopyExternalImage, destination: GPUImageCopyTexture, copySize: GPUExtent3D): void;
  }

  interface GPUCommandBufferDescriptor {
    label?: string;
  }

  class GPUCommandBuffer {}

  interface GPUCommandEncoderDescriptor {
    label?: string;
  }

  class GPUCommandEncoder {
    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
    beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
    copyBufferToCopySize(
      source: GPUBuffer,
      sourceOffset: number,
      destination: GPUBuffer,
      destinationOffset: number,
      copySize: number,
    ): void;
    copyBufferToTexture(
      source: GPUImageCopyBuffer,
      destination: GPUImageCopyTexture,
      copySize: GPUExtent3D,
    ): void;
    copyTextureToBuffer(
      source: GPUImageCopyTexture,
      destination: GPUImageCopyBuffer,
      copySize: GPUExtent3D,
    ): void;
    copyTextureToTexture(
      source: GPUImageCopyTexture,
      destination: GPUImageCopyTexture,
      copySize: GPUExtent3D,
    ): void;
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
    finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer;
    pushDebugGroup(groupLabel: string): void;
    popDebugGroup(): void;
    insertDebugMarker(markerLabel: string): void;
  }

  interface GPUBindGroupLayoutDescriptor {
    label?: string;
    entries: Iterable<GPUBindGroupLayoutEntry>;
  }

  interface GPUBindGroupLayoutEntry {
    binding: number;
    visibility: GPUShaderStageFlags;
    buffer?: GPUBufferBindingLayout;
    sampler?: GPUSamplerBindingLayout;
    texture?: GPUTextureBindingLayout;
    storageTexture?: GPUStorageTextureBindingLayout;
    externalTexture?: GPUExternalTextureBindingLayout;
  }

  type GPUShaderStageFlags = number;
  interface GPUShaderStage {
    readonly VERTEX: GPUShaderStageFlags;
    readonly FRAGMENT: GPUShaderStageFlags;
    readonly COMPUTE: GPUShaderStageFlags;
  }

  var GPUShaderStage: GPUShaderStage;

  interface GPUBufferBindingLayout {
    type: GPUBufferBindingType;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
  }

  type GPUBufferBindingType = 'uniform' | 'storage' | 'read-only-storage';

  interface GPUBindGroupDescriptor {
    label?: string;
    layout: GPUBindGroupLayout;
    entries: Iterable<GPUBindGroupEntry>;
  }

  interface GPUBindGroupEntry {
    binding: number;
    resource: GPUBindingResource;
  }

  type GPUBindingResource = GPUBufferBinding | GPUSampler | GPUTextureView | GPUExternalTexture;

  interface GPUBufferBinding {
    buffer: GPUBuffer;
    offset?: number;
    size?: number;
  }

  class GPUBindGroup {}

  interface GPUPipelineLayoutDescriptor {
    label?: string;
    bindGroupLayouts: Iterable<GPUBindGroupLayout>;
  }

  class GPUPipelineLayout {}

  interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
  }

  class GPUShaderModule {
    readonly compilationInfo: Promise<GPUCompilationInfo>;
  }

  interface GPUCompilationInfo {
    readonly messages: Iterable<GPUCompilationMessage>;
  }

  interface GPUCompilationMessage {
    readonly message: string;
    readonly type: GPUCompilationMessageType;
    readonly lineNum: number;
    readonly linePos: number;
    readonly offset: number;
    readonly length: number;
  }

  type GPUCompilationMessageType = 'error' | 'warning' | 'info';

  interface GPUComputePipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout | 'auto';
    compute: GPUProgrammableStage;
  }

  interface GPUProgrammableStage {
    module: GPUShaderModule;
    entryPoint: string;
    constants?: Record<string, number>;
  }

  class GPUComputePipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
  }

  interface GPUComputePassDescriptor {
    label?: string;
    timestampWrites?: GPUComputePassTimestampWrites;
  }

  interface GPUComputePassTimestampWrites {
    querySet: GPUQuerySet;
    beginningOfPassWriteIndex: number;
    endOfPassWriteIndex: number;
  }

  class GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: Iterable<number>): void;
    dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
    dispatchWorkgroupsIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
    end(): void;
    pushDebugGroup(groupLabel: string): void;
    popDebugGroup(): void;
    insertDebugMarker(markerLabel: string): void;
  }

  interface GPUDeviceLostInfo {
    readonly reason: string;
    readonly message: string;
  }

  type GPUErrorFilter = 'out-of-memory' | 'validation';

  interface GPUError {
    readonly type: string;
    readonly message: string;
  }

  interface GPUImageCopyTexture {
    texture: GPUTexture;
    mipLevel?: number;
    origin?: GPUOrigin3D;
    aspect?: GPUTextureAspect;
  }

  interface GPUOrigin3D {
    x?: number;
    y?: number;
    z?: number;
  }

  type GPUTextureAspect = 'all' | 'stencil-only' | 'depth-only';

  interface GPUImageCopyBuffer {
    buffer: GPUBuffer;
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
  }

  interface GPUImageDataLayout {
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
  }

  interface GPUExtent3D {
    width: number;
    height?: number;
    depthOrArrayLayers?: number;
  }

  interface GPUImageCopyExternalImage {
    source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
    origin?: GPUOrigin2D;
    flipY?: boolean;
  }

  interface GPUOrigin2D {
    x?: number;
    y?: number;
  }
}

export {};
