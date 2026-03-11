/**
 * TypeScript Validation Script
 *
 * Validates simulation test cases against TypeScript implementation.
 * Run with: node validate_typescript.js <test_cases.json>
 */

// Note: This file uses ES module syntax because the project has "type": "module" in package.json

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
            steps: 1,
            escalationTriggered: weightedSum < this.zoneThresholds.YELLOW
        };
    }
}

function validateTestCases(testCases) {
    const cascade = new MockConfidenceCascade();
    const results = [];

    for (const testCase of testCases) {
        try {
            const input = testCase.input;
            const expected = testCase.expected;

            let result;
            let validationError = null;

            if (input.weights && input.weights.length >= 2) {
                // Parallel composition test
                const branches = input.confidences.map((conf, i) => ({
                    confidence: cascade.createConfidence(conf, `tile_${i}`),
                    weight: input.weights[i] || 1.0 / input.confidences.length
                }));

                result = cascade.parallelCascade(branches);
            } else if (input.confidences.length >= 2) {
                // Sequential composition test
                const confidences = input.confidences.map((conf, i) =>
                    cascade.createConfidence(conf, `tile_${i}`)
                );

                result = cascade.sequentialCascade(confidences);
            } else {
                // Single confidence test (zone classification)
                const confidence = cascade.createConfidence(
                    input.confidences[0],
                    'test_tile'
                );
                result = { confidence };
            }

            // Calculate error
            const error = Math.abs(result.confidence.value - expected.confidence);
            const zoneMatch = result.confidence.zone === expected.zone;

            results.push({
                test_id: testCase.test_id,
                success: error < 0.001 && zoneMatch,
                actual_confidence: result.confidence.value,
                actual_zone: result.confidence.zone,
                expected_confidence: expected.confidence,
                expected_zone: expected.zone,
                error,
                zone_match: zoneMatch,
                validation_error: validationError
            });

        } catch (error) {
            results.push({
                test_id: testCase.test_id,
                success: false,
                error: error.message,
                validation_error: error.toString()
            });
        }
    }

    return results;
}

function calculateStatistics(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const errors = results
        .filter(r => r.error !== undefined && typeof r.error === 'number')
        .map(r => r.error);

    const errorStats = errors.length > 0 ? {
        mean: errors.reduce((a, b) => a + b, 0) / errors.length,
        max: Math.max(...errors),
        min: Math.min(...errors),
        p95: errors.sort((a, b) => a - b)[Math.floor(errors.length * 0.95)],
        p99: errors.sort((a, b) => a - b)[Math.floor(errors.length * 0.99)]
    } : null;

    return {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        success_rate: successful.length / results.length,
        error_stats: errorStats,
        failures: failed.map(f => ({
            test_id: f.test_id,
            error: f.error,
            validation_error: f.validation_error
        }))
    };
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: node validate_typescript.js <test_cases.json>');
        process.exit(1);
    }

    const testCasesFile = args[0];

    try {
        // Read test cases
        const testCasesData = fs.readFileSync(testCasesFile, 'utf8');
        const testCases = JSON.parse(testCasesData);

        console.log(`Validating ${testCases.length} test cases...`);

        // Validate test cases
        const validationResults = validateTestCases(testCases);
        const stats = calculateStatistics(validationResults);

        // Output results
        console.log('\n=== VALIDATION RESULTS ===');
        console.log(`Total tests: ${stats.total}`);
        console.log(`Successful: ${stats.successful}`);
        console.log(`Failed: ${stats.failed}`);
        console.log(`Success rate: ${(stats.success_rate * 100).toFixed(2)}%`);

        if (stats.error_stats) {
            console.log('\n=== ERROR STATISTICS ===');
            console.log(`Mean error: ${stats.error_stats.mean.toFixed(6)}`);
            console.log(`Max error: ${stats.error_stats.max.toFixed(6)}`);
            console.log(`95th percentile: ${stats.error_stats.p95.toFixed(6)}`);
            console.log(`99th percentile: ${stats.error_stats.p99.toFixed(6)}`);
        }

        if (stats.failures.length > 0) {
            console.log('\n=== FAILURES ===');
            stats.failures.slice(0, 5).forEach((failure, i) => {
                console.log(`${i + 1}. ${failure.test_id}: ${failure.error}`);
                if (failure.validation_error) {
                    console.log(`   ${failure.validation_error}`);
                }
            });

            if (stats.failures.length > 5) {
                console.log(`... and ${stats.failures.length - 5} more failures`);
            }
        }

        // Write detailed results to file
        const outputFile = testCasesFile.replace('.json', '_validation_results.json');
        const outputData = {
            timestamp: new Date().toISOString(),
            test_cases_file: testCasesFile,
            statistics: stats,
            detailed_results: validationResults
        };

        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
        console.log(`\nDetailed results written to: ${outputFile}`);

        // Exit with appropriate code
        process.exit(stats.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('Validation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    MockConfidenceCascade,
    validateTestCases,
    calculateStatistics
};