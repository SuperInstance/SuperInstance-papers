/**
 * TypeScript Validation Script (ES Module)
 *
 * Validates simulation test cases against TypeScript implementation.
 * Run with: node validate_typescript.mjs
 * Reads test cases from stdin (passed from Python)
 */

// Mock implementation for validation
// In practice, this would import the actual TypeScript implementation
class MockConfidenceCascade {
    constructor() {
        this.zoneThresholds = {
            GREEN: 0.85,
            YELLOW: 0.60,
            RED: 0.00
        };
    }

    createConfidence(value, source) {
        if (value < 0 || value > 1) {
            throw new Error(`Confidence must be between 0 and 1, got ${value}`);
        }

        return {
            value,
            zone: this.classifyZone(value),
            source,
            timestamp: Date.now()
        };
    }

    classifyZone(value) {
        if (value >= this.zoneThresholds.GREEN) return 'GREEN';
        if (value >= this.zoneThresholds.YELLOW) return 'YELLOW';
        return 'RED';
    }

    sequentialCascade(confidences) {
        let accumulated = 1.0;
        for (const conf of confidences) {
            accumulated *= conf.value;
        }

        return {
            confidence: this.createConfidence(accumulated, 'sequential_complete'),
            steps: confidences.length,
            escalationTriggered: accumulated < this.zoneThresholds.YELLOW
        };
    }

    parallelCascade(branches) {
        // Normalize weights
        const totalWeight = branches.reduce((sum, b) => sum + b.weight, 0);
        const normalizedBranches = branches.map(b => ({
            ...b,
            weight: b.weight / totalWeight
        }));

        // Calculate weighted average
        const weightedSum = normalizedBranches.reduce(
            (sum, b) => sum + b.confidence.value * b.weight,
            0
        );

        return {
            confidence: this.createConfidence(weightedSum, 'parallel_complete'),
            steps: branches.length,
            escalationTriggered: weightedSum < this.zoneThresholds.YELLOW
        };
    }
}

// Validation function
function validateTestCases(testCases) {
    const validator = new MockConfidenceCascade();
    const results = [];

    for (const testCase of testCases) {
        try {
            let validationResult;
            let validationError = null;

            if (testCase.composition_type === 'sequential') {
                // Create confidence objects
                const confidences = testCase.confidences.map((c, i) =>
                    validator.createConfidence(c, `test_${i}`)
                );

                // Run cascade
                const cascadeResult = validator.sequentialCascade(confidences);
                const actualConfidence = cascadeResult.confidence.value;
                const actualZone = cascadeResult.confidence.zone;

                // Compare with expected
                const error = Math.abs(actualConfidence - testCase.expected_confidence);
                const zoneMatch = actualZone === testCase.expected_zone;

                validationResult = {
                    test_id: testCase.test_id,
                    composition_type: testCase.composition_type,
                    confidences: testCase.confidences,
                    expected_confidence: testCase.expected_confidence,
                    expected_zone: testCase.expected_zone,
                    actual_confidence: actualConfidence,
                    actual_zone: actualZone,
                    error,
                    zone_match: zoneMatch,
                    validation_passed: error < 0.001 && zoneMatch
                };

            } else if (testCase.composition_type === 'parallel') {
                // Create branches with weights
                const branches = testCase.confidences.map((c, i) => ({
                    confidence: validator.createConfidence(c, `test_${i}`),
                    weight: testCase.weights ? testCase.weights[i] : 1.0 / testCase.confidences.length
                }));

                // Run cascade
                const cascadeResult = validator.parallelCascade(branches);
                const actualConfidence = cascadeResult.confidence.value;
                const actualZone = cascadeResult.confidence.zone;

                // Compare with expected
                const error = Math.abs(actualConfidence - testCase.expected_confidence);
                const zoneMatch = actualZone === testCase.expected_zone;

                validationResult = {
                    test_id: testCase.test_id,
                    composition_type: testCase.composition_type,
                    confidences: testCase.confidences,
                    weights: testCase.weights,
                    expected_confidence: testCase.expected_confidence,
                    expected_zone: testCase.expected_zone,
                    actual_confidence: actualConfidence,
                    actual_zone: actualZone,
                    error,
                    zone_match: zoneMatch,
                    validation_passed: error < 0.001 && zoneMatch
                };

            } else {
                validationError = `Unknown composition type: ${testCase.composition_type}`;
                validationResult = {
                    test_id: testCase.test_id,
                    error: validationError,
                    validation_passed: false
                };
            }

            results.push(validationResult);

        } catch (error) {
            results.push({
                test_id: testCase.test_id || `test_${results.length}`,
                error: error.message,
                validation_passed: false
            });
        }
    }

    return results;
}

// Calculate statistics
function calculateStatistics(validationResults) {
    const passed = validationResults.filter(r => r.validation_passed);
    const failed = validationResults.filter(r => !r.validation_passed);

    const errors = validationResults
        .filter(r => r.error !== undefined)
        .map(r => r.error);

    const errorStats = errors.length > 0 ? {
        mean: errors.reduce((a, b) => a + b, 0) / errors.length,
        max: Math.max(...errors),
        min: Math.min(...errors),
        p95: errors.sort((a, b) => a - b)[Math.floor(errors.length * 0.95)],
        p99: errors.sort((a, b) => a - b)[Math.floor(errors.length * 0.99)]
    } : {
        mean: 0, max: 0, min: 0, p95: 0, p99: 0
    };

    return {
        total: validationResults.length,
        passed: passed.length,
        failed: failed.length,
        success_rate: passed.length / validationResults.length,
        error_stats: errorStats,
        failures: failed.map(f => ({
            test_id: f.test_id,
            error: f.error,
            validation_error: f.validation_error
        }))
    };
}

// Main function for command-line usage
async function main() {
    try {
        // Read test cases from stdin
        let inputData = '';
        for await (const chunk of process.stdin) {
            inputData += chunk;
        }

        if (!inputData) {
            console.error('No test cases provided via stdin');
            process.exit(1);
        }

        const testCases = JSON.parse(inputData);
        const validationResults = validateTestCases(testCases);
        const stats = calculateStatistics(validationResults);

        // Output results as JSON
        console.log(JSON.stringify(validationResults, null, 2));

    } catch (error) {
        console.error('Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// Export for testing
export {
    MockConfidenceCascade,
    validateTestCases,
    calculateStatistics
};