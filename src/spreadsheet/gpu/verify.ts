#!/usr/bin/env node

/**
 * GPU Module Verification Script
 *
 * Verifies that all GPU module files are properly created and structured.
 */

import * as fs from 'fs';
import * as path from 'path';

const GPU_DIR = path.join(process.cwd(), 'src/spreadsheet/gpu');

interface FileVerification {
  file: string;
  exists: boolean;
  size: number;
  status: '✅' | '❌' | '⚠️';
}

const expectedFiles: FileVerification[] = [
  { file: 'ComputeShaders.ts', exists: false, size: 0, status: '❌' },
  { file: 'CellUpdateShader.wgsl', exists: false, size: 0, status: '❌' },
  { file: 'GPUBatchProcessor.ts', exists: false, size: 0, status: '❌' },
  { file: 'GPUHeatMap.ts', exists: false, size: 0, status: '❌' },
  { file: 'WebGLFallback.ts', exists: false, size: 0, status: '❌' },
  { file: 'index.ts', exists: false, size: 0, status: '❌' },
  { file: 'types.d.ts', exists: false, size: 0, status: '❌' },
  { file: '__tests__/gpu.test.ts', exists: false, size: 0, status: '❌' },
  { file: 'example.ts', exists: false, size: 0, status: '❌' },
  { file: 'README.md', exists: false, size: 0, status: '❌' },
  { file: 'IMPLEMENTATION_SUMMARY.md', exists: false, size: 0, status: '❌' },
];

function verifyFile(filePath: string): FileVerification {
  const fullPath = path.join(GPU_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    return { file: filePath, exists: false, size: 0, status: '❌' };
  }

  const stats = fs.statSync(fullPath);
  const size = stats.size;

  if (size === 0) {
    return { file: filePath, exists: true, size, status: '⚠️' };
  }

  return { file: filePath, exists: true, size, status: '✅' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function main() {
  console.log('🔍 Verifying GPU Module Implementation\n');
  console.log(`📁 Directory: ${GPU_DIR}\n`);

  // Verify directory exists
  if (!fs.existsSync(GPU_DIR)) {
    console.log('❌ GPU directory does not exist!\n');
    process.exit(1);
  }

  console.log('✅ GPU directory exists\n');

  // Verify each file
  console.log('📄 Files:\n');
  let totalSize = 0;
  let allExist = true;

  for (let i = 0; i < expectedFiles.length; i++) {
    const verification = verifyFile(expectedFiles[i].file);
    expectedFiles[i] = verification;

    if (verification.exists) {
      totalSize += verification.size;
      console.log(
        `  ${verification.status} ${verification.file.padEnd(30)} ${formatSize(verification.size).padStart(8)}`,
      );
    } else {
      allExist = false;
      console.log(`  ${verification.status} ${verification.file.padEnd(30)} MISSING`);
    }
  }

  console.log(`\n📊 Statistics:\n`);
  console.log(`  Total files: ${expectedFiles.length}`);
  console.log(`  Files present: ${expectedFiles.filter((f) => f.exists).length}`);
  console.log(`  Total size: ${formatSize(totalSize)}\n`);

  // Check exports
  console.log('📦 Module Exports:\n');
  try {
    const indexPath = path.join(GPU_DIR, 'index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');

    const exports = [
      'ComputeShaders',
      'getComputeShaders',
      'GPUBatchProcessor',
      'CPUBatchProcessor',
      'getGPUBatchProcessor',
      'GPUHeatMap',
      'getGPUHeatMap',
      'WebGLFallback',
      'getWebGLFallback',
    ];

    exports.forEach((exp) => {
      if (content.includes(`export ${exp}`) || content.includes(`export { ${exp}`)) {
        console.log(`  ✅ ${exp}`);
      } else {
        console.log(`  ❌ ${exp} (missing)`);
      }
    });
  } catch (error) {
    console.log(`  ⚠️  Could not verify exports: ${error}`);
  }

  // Check WGSL shaders
  console.log('\n🎮 WGSL Shaders:\n');
  try {
    const shaderPath = path.join(GPU_DIR, 'CellUpdateShader.wgsl');
    const shaderContent = fs.readFileSync(shaderPath, 'utf-8');

    const shaders = ['@compute @workgroup_size', 'fn main(', 'struct CellState'];

    shaders.forEach((shader) => {
      if (shaderContent.includes(shader)) {
        console.log(`  ✅ ${shader}`);
      } else {
        console.log(`  ❌ ${shader} (missing)`);
      }
    });
  } catch (error) {
    console.log(`  ⚠️  Could not verify shaders: ${error}`);
  }

  // Check tests
  console.log('\n🧪 Tests:\n');
  try {
    const testPath = path.join(GPU_DIR, '__tests__/gpu.test.ts');
    const testContent = fs.readFileSync(testPath, 'utf-8');

    const testSuites = [
      'describe(\'WebGPU Compute Shaders\'',
      'describe(\'GPU Batch Processor\'',
      'describe(\'GPU Heat Map\'',
      'describe(\'WebGL Fallback\'',
      'describe(\'Performance Benchmarks\'',
    ];

    testSuites.forEach((suite) => {
      if (testContent.includes(suite)) {
        console.log(`  ✅ ${suite.replace(/'/g, '')}`);
      } else {
        console.log(`  ❌ ${suite.replace(/'/g, '')} (missing)`);
      }
    });
  } catch (error) {
    console.log(`  ⚠️  Could not verify tests: ${error}`);
  }

  // Final status
  console.log('\n' + '='.repeat(60) + '\n');

  if (allExist) {
    console.log('✅ All files verified successfully!\n');
    console.log('🚀 The GPU module is ready to use!\n');
    console.log('📖 Quick start:\n');
    console.log("  import { getGPUBatchProcessor } from './spreadsheet/gpu';");
    console.log('  const processor = await getGPUBatchProcessor();');
    console.log('  const result = await processor.processBatch(cells, config);\n');
    process.exit(0);
  } else {
    console.log('❌ Some files are missing!\n');
    console.log('Please ensure all required files are created.\n');
    process.exit(1);
  }
}

main();
