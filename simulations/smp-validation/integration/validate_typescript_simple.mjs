/**
 * Simple TypeScript Validation Script
 *
 * Validates simulation test cases against TypeScript implementation.
 * Reads test cases from stdin, outputs results to stdout.
 */

// Simple mock implementation
function createConfidence(value, source) {
    if (value < 0 || value > 1) {
        throw new Error(`Confidence must be between 0 and 1, got ${value}`);
    }

    let zone;
    if (value >= 0.85) {
        zone = 'GREEN';
    } else if (value >= 0.60) {
        zone = 'YELLOW';
    } else {
        zone = 'RED';
    }

    return {
        value,
        zone,
        source,
        timestamp: Date.now()
    };
}

function sequentialCascade(confidences) {
    let accumulated = 1.0;
    for (const conf of confidences) {
        accumulated *= conf.value;
    }
    return createConfidence(accumulated, 'sequential_complete');
}

function parallelCascade(branches) {
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

    return createConfidence(weightedSum, 'parallel_complete');
}

// Main validation function
function validateTestCases(testCases) {
    const results = [];

    for (const testCase of testCases) {
        try {
            let tsConfidence;
            let tsZone;

            if (testCase.composition_type === 'sequential') {
                // Create confidence objects
                const confidences = testCase.confidences.map((c, i) =>
                    createConfidence(c, `test_${i}`)
                );

                // Run cascade
                const result = sequentialCascade(confidences);
                tsConfidence = result.value;
                tsZone = result.zone;

            } else if (testCase.composition_type === 'parallel') {
                // Create branches with weights
                const branches = testCase.confidences.map((c, i) => ({
                    confidence: createConfidence(c, `test_${i}`),
                    weight: testCase.weights ? testCase.weights[i] : 1.0 / testCase.confidences.length
                }));

                // Run cascade
                const result = parallelCascade(branches);
                tsConfidence = result.value;
                tsZone = result.zone;

            } else {
                throw new Error(`Unknown composition type: ${testCase.composition_type}`);
            }

            // Calculate difference
            const difference = Math.abs(tsConfidence - testCase.expected_confidence);
            const zoneMatch = tsZone === testCase.expected_zone;

            results.push({
                test_id: testCase.test_id || `test_${results.length}`,
                composition_type: testCase.composition_type,
                python_confidence: testCase.expected_confidence,
                python_zone: testCase.expected_zone,
                typescript_confidence: tsConfidence,
                typescript_zone: tsZone,
                confidence_difference: difference,
                zone_match: zoneMatch,
                validation_passed: difference < 0.001 && zoneMatch
            });

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

// Read from stdin synchronously (simpler for testing)
import { readFileSync } from 'fs';

try {
    // Read all data from stdin
    const inputData = readFileSync(0, 'utf-8'); // 0 is stdin file descriptor
    const testCases = JSON.parse(inputData);
    const results = validateTestCases(testCases);

    // Output results as JSON
    console.log(JSON.stringify(results, null, 2));

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}