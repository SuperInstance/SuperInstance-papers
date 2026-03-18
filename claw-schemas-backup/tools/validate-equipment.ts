#!/usr/bin/env node

/**
 * Equipment Schema Validator
 *
 * Validates equipment definitions against the equipment JSON schema.
 * Usage: node validate-equipment.ts <equipment-file.json>
 *
 * @example
 *   node validate-equipment.ts ../examples/equipment-examples.json
 *   node validate-equipment.ts ./my-equipment.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Equipment JSON Schema (embedded for validation)
const EQUIPMENT_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": [
    "name", "slot", "version", "description", "cost", "benefit",
    "trigger_thresholds", "capabilities", "muscle_memory"
  ],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$"
    },
    "slot": {
      "type": "string",
      "enum": [
        "MEMORY", "REASONING", "CONSENSUS", "SPREADSHEET", "DISTILLATION",
        "PERCEPTION", "COORDINATION", "COMMUNICATION", "SELF_IMPROVEMENT", "MONITORING"
      ]
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "description": {
      "type": "string",
      "minLength": 20,
      "maxLength": 500
    },
    "cost": {
      "type": "object",
      "required": ["memory_bytes", "cpu_percent", "latency_ms", "cost_per_use"],
      "properties": {
        "memory_bytes": { "type": "integer", "minimum": 0 },
        "cpu_percent": { "type": "number", "minimum": 0, "maximum": 100 },
        "latency_ms": { "type": "number", "minimum": 0 },
        "cost_per_use": { "type": "number", "minimum": 0 },
        "energy_joules": { "type": "number", "minimum": 0 }
      }
    },
    "benefit": {
      "type": "object",
      "required": ["accuracy_boost", "speed_multiplier"],
      "properties": {
        "accuracy_boost": { "type": "number", "minimum": 0, "maximum": 1 },
        "speed_multiplier": { "type": "number", "minimum": 0 },
        "confidence_boost": { "type": "number", "minimum": 0, "maximum": 1 },
        "capability_gain": {
          "type": "array",
          "items": { "type": "string" },
          "uniqueItems": true
        },
        "reliability_improvement": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "trigger_thresholds": {
      "type": "object",
      "required": ["equip_when", "unequip_when"],
      "properties": {
        "equip_when": { "type": "object" },
        "unequip_when": { "type": "object" },
        "call_teacher": {
          "type": "object",
          "properties": {
            "min_confidence": { "type": "number", "minimum": 0, "maximum": 1 },
            "max_confidence": { "type": "number", "minimum": 0, "maximum": 1 },
            "teacher_equipment": { "type": "string" }
          }
        }
      }
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": { "type": "string", "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$" },
          "description": { "type": "string", "minLength": 10 },
          "metrics": { "type": "object" }
        }
      },
      "uniqueItems": true,
      "minItems": 1
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$" },
      "uniqueItems": true
    },
    "conflicts": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$" },
      "uniqueItems": true
    },
    "muscle_memory": {
      "type": "object",
      "required": ["triggers"],
      "properties": {
        "triggers": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["condition", "action"],
            "properties": {
              "condition": { "type": "object" },
              "action": { "type": "string", "enum": ["equip", "recommend", "notify"] },
              "priority": { "type": "integer", "minimum": 0, "maximum": 100 },
              "cooldown_seconds": { "type": "integer", "minimum": 0 }
            }
          },
          "minItems": 1
        },
        "use_count": { "type": "integer", "minimum": 0 },
        "success_rate": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "implementation": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["native", "plugin", "remote", "hybrid"] },
        "entry_point": { "type": "string" },
        "language": { "type": "string", "enum": ["rust", "python", "typescript", "wasm", "cpp", "other"] },
        "requirements": { "type": "array", "items": { "type": "string" } }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "author": { "type": "string" },
        "license": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
        "documentation_url": { "type": "string", "format": "uri" },
        "source_url": { "type": "string", "format": "uri" },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    }
  }
};

interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

class EquipmentValidator {
  private errors: ValidationError[] = [];
  private warnings: string[] = [];

  /**
   * Validate an equipment definition
   */
  validate(equipment: any): boolean {
    this.errors = [];
    this.warnings = [];

    // Validate against schema
    this.validateSchema(equipment, '', EQUIPMENT_SCHEMA);

    // Additional business logic validation
    this.validateBusinessLogic(equipment);

    return this.errors.length === 0;
  }

  /**
   * Validate against JSON schema
   */
  private validateSchema(data: any, path: string, schema: any): void {
    if (schema.type && typeof data !== schema.type) {
      this.errors.push({
        path,
        message: `Expected type ${schema.type}, got ${typeof data}`,
        value: data
      });
      return;
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          this.errors.push({
            path: `${path}.${field}`,
            message: `Required field '${field}' is missing`
          });
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          this.validateSchema(data[key], `${path}.${key}`, propSchema);
        }
      }
    }

    if (schema.pattern && typeof data === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        this.errors.push({
          path,
          message: `Value does not match pattern ${schema.pattern}`,
          value: data
        });
      }
    }

    if (schema.enum && !schema.enum.includes(data)) {
      this.errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value: data
      });
    }

    if (schema.minimum !== undefined && data < schema.minimum) {
      this.errors.push({
        path,
        message: `Value must be >= ${schema.minimum}`,
        value: data
      });
    }

    if (schema.maximum !== undefined && data > schema.maximum) {
      this.errors.push({
        path,
        message: `Value must be <= ${schema.maximum}`,
        value: data
      });
    }

    if (schema.minLength !== undefined && data.length < schema.minLength) {
      this.errors.push({
        path,
        message: `Length must be >= ${schema.minLength}`,
        value: data
      });
    }

    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      this.errors.push({
        path,
        message: `Length must be <= ${schema.maxLength}`,
        value: data
      });
    }

    if (schema.uniqueItems && Array.isArray(data)) {
      const unique = new Set(data);
      if (unique.size !== data.length) {
        this.errors.push({
          path,
          message: 'Array items must be unique'
        });
      }
    }

    if (schema.minItems !== undefined && data.length < schema.minItems) {
      this.errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items`
      });
    }

    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        this.validateSchema(item, `${path}[${index}]`, schema.items);
      });
    }
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(equipment: any): void {
    // Cost/benefit ratio sanity check
    const totalCost = (
      (equipment.cost?.memory_bytes || 0) / 1e6 +
      (equipment.cost?.cpu_percent || 0) +
      (equipment.cost?.latency_ms || 0) / 10 +
      (equipment.cost?.cost_per_use || 0) * 100
    );

    const totalBenefit = (
      (equipment.benefit?.accuracy_boost || 0) * 10 +
      (equipment.benefit?.speed_multiplier || 1) +
      (equipment.benefit?.confidence_boost || 0) * 5 +
      (equipment.benefit?.capability_gain?.length || 0) * 2
    );

    if (totalCost > totalBenefit * 5) {
      this.warnings.push(
        `High cost/benefit ratio (${totalCost.toFixed(2)} / ${totalBenefit.toFixed(2)}). ` +
        'Consider if benefits justify the costs.'
      );
    }

    // Deadband validation
    if (equipment.trigger_thresholds?.call_teacher) {
      const { min_confidence, max_confidence } = equipment.trigger_thresholds.call_teacher;
      if (min_confidence >= max_confidence) {
        this.errors.push({
          path: 'trigger_thresholds.call_teacher',
          message: `min_confidence (${min_confidence}) must be < max_confidence (${max_confidence})`
        });
      }
    }

    // Check for self-dependencies
    if (equipment.dependencies?.includes(equipment.name)) {
      this.errors.push({
        path: 'dependencies',
        message: 'Equipment cannot depend on itself'
      });
    }

    // Check for self-conflicts
    if (equipment.conflicts?.includes(equipment.name)) {
      this.errors.push({
        path: 'conflicts',
        message: 'Equipment cannot conflict with itself'
      });
    }

    // Trigger priority range
    if (equipment.muscle_memory?.triggers) {
      for (const trigger of equipment.muscle_memory.triggers) {
        if (trigger.priority !== undefined && (trigger.priority < 0 || trigger.priority > 100)) {
          this.errors.push({
            path: 'muscle_memory.triggers.priority',
            message: 'Priority must be between 0 and 100'
          });
        }
      }
    }
  }

  /**
   * Get validation errors
   */
  getErrors(): ValidationError[] {
    return this.errors;
  }

  /**
   * Get validation warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Format errors for display
   */
  formatErrors(): string {
    if (this.errors.length === 0) {
      return 'No errors found.';
    }

    let output = '\n❌ Validation Errors:\n\n';
    for (const error of this.errors) {
      output += `  • ${error.path}: ${error.message}\n`;
      if (error.value !== undefined) {
        output += `    Value: ${JSON.stringify(error.value)}\n`;
      }
    }
    return output;
  }

  /**
   * Format warnings for display
   */
  formatWarnings(): string {
    if (this.warnings.length === 0) {
      return '';
    }

    let output = '\n⚠️  Warnings:\n\n';
    for (const warning of this.warnings) {
      output += `  • ${warning}\n`;
    }
    return output;
  }
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node validate-equipment.ts <equipment-file.json>');
    console.log('\nExample:');
    console.log('  node validate-equipment.ts ../examples/equipment-examples.json');
    process.exit(1);
  }

  const filePath = args[0];
  const fullPath = path.resolve(__dirname, filePath);

  console.log(`🔍 Validating: ${fullPath}\n`);

  // Read equipment file
  let data: any;
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    process.exit(1);
  }

  // Handle both single equipment and arrays
  const equipmentList = Array.isArray(data) ? data :
                       (data.examples || [data]);

  console.log(`📦 Found ${equipmentList.length} equipment definition(s)\n`);

  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < equipmentList.length; i++) {
    const equipment = equipmentList[i];
    const equipmentName = equipment.name || `Equipment ${i + 1}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Validating: ${equipmentName}`);
    console.log('='.repeat(60));

    const validator = new EquipmentValidator();
    const isValid = validator.validate(equipment);

    if (isValid) {
      validCount++;
      console.log(`\n✅ ${equipmentName} is valid!`);
      console.log(`   Slot: ${equipment.slot}`);
      console.log(`   Version: ${equipment.version}`);
      console.log(`   Capabilities: ${equipment.capabilities?.length || 0}`);
    } else {
      invalidCount++;
      console.log(validator.formatErrors());
    }

    const warnings = validator.formatWarnings();
    if (warnings) {
      console.log(warnings);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`✅ Valid: ${validCount}`);
  console.log(`❌ Invalid: ${invalidCount}`);
  console.log(`📦 Total: ${equipmentList.length}`);

  process.exit(invalidCount > 0 ? 1 : 0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EquipmentValidator, ValidationError };
