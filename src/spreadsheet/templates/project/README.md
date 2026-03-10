# Project Management Spreadsheet Template

A comprehensive project management template built with POLLN living cells, featuring intelligent task tracking, resource optimization, and predictive timeline analysis.

## Overview

This template provides a complete project management system with:
- **Task Tracking**: Hierarchical task management with dependency resolution
- **Resource Allocation**: Intelligent resource assignment and utilization monitoring
- **Timeline Visualization**: Dynamic Gantt chart with critical path analysis
- **Risk Assessment**: Automated risk detection and mitigation suggestions
- **Progress Monitoring**: Real-time status updates with predictive completion

## Template Structure

```
ProjectTemplate
├── Task Management
│   ├── Task Definition (InputCell)
│   ├── Task Dependencies (TransformCell)
│   ├── Task Status (AnalysisCell)
│   └── Task Completion (PredictionCell)
├── Resource Management
│   ├── Resource Definition (InputCell)
│   ├── Resource Assignment (TransformCell)
│   ├── Utilization Tracking (AnalysisCell)
│   └── Resource Forecast (PredictionCell)
├── Timeline Management
│   ├── Milestone Tracking (DecisionCell)
│   ├── Critical Path Analysis (AnalysisCell)
│   ├── Gantt Chart (TransformCell)
│   └── Schedule Variance (AnalysisCell)
└── Risk Management
    ├── Risk Identification (AnalysisCell)
    ├── Probability Assessment (PredictionCell)
    ├── Impact Analysis (TransformCell)
    └── Mitigation Planning (DecisionCell)
```

## Key Features

### 1. Task Management with Dependencies

**Living Cells Monitor:**
- Task completion status
- Dependency completion
- Blockage detection
- Critical path changes
- Resource availability

**Example Task Configuration:**
```typescript
const taskCell = new InputCell({
  id: 'task_design_ui',
  value: {
    name: 'Design UI Mockups',
    status: 'in_progress',
    assignee: 'alice',
    estimatedHours: 40,
    actualHours: 32,
    dependencies: ['task_requirements'],
    priority: 'high'
  },
  sensations: [
    {
      targetId: 'task_requirements',
      type: SensationType.PRESENCE,
      threshold: 1,
      interpretation: 'Wait for requirements to complete'
    }
  ]
});
```

### 2. Resource Allocation and Utilization

**Intelligent Assignment:**
- Skill matching
- Availability checking
- Workload balancing
- Cost optimization
- Conflict resolution

**Resource Utilization Example:**
```typescript
const utilizationCell = new AnalysisCell({
  id: 'resource_utilization',
  analysisType: 'utilization',
  sourceCellIds: ['task_assignments', 'resource_capacity'],
  consciousness: {
    enabled: true,
    logReasoning: true
  }
});

// Cell consciousness tracks:
// - Who is over/under-utilized
// - Resource bottlenecks
// - Cost implications
// - Optimization opportunities
```

### 3. Timeline Visualization and Critical Path

**Dynamic Gantt Chart:**
- Real-time timeline updates
- Critical path highlighting
- Slack time visualization
- Milestone tracking
- Progress indication

**Critical Path Analysis:**
```typescript
const criticalPathCell = new AnalysisCell({
  id: 'critical_path',
  analysisType: 'critical_path',
  sourceCellIds: ['tasks', 'dependencies', 'durations'],
  consciousness: {
    enabled: true
  }
});

// Automatically detects:
// - Critical tasks
// - Near-critical tasks
// - Float/slack time
// - Schedule risks
```

### 4. Risk Assessment and Mitigation

**Automated Risk Detection:**
- Schedule overruns
- Resource conflicts
- Dependency failures
- Scope creep
- Budget risks

**Risk Mitigation Planning:**
```typescript
const riskMitigation = new DecisionCell({
  id: 'risk_mitigation',
  decisionLogic: (context) => {
    const scheduleRisk = context.getValue('schedule_risk_probability');
    const impact = context.getValue('schedule_risk_impact');

    if (scheduleRisk > 0.7 && impact > 0.5) {
      return {
        decision: 'MITIGATE',
        confidence: 0.92,
        reasoning: 'High schedule risk with significant impact',
        actions: [
          'add_resources',
          'reprioritize_tasks',
          'update_stakeholders'
        ]
      };
    }
  }
});
```

## Consciousness Streams

Every project cell maintains awareness of:
- **Task Status Changes**: When tasks start/finish
- **Dependency Resolution**: When dependencies are satisfied
- **Resource Conflicts**: When resources are over-allocated
- **Schedule Variance**: When timeline slips
- **Risk Emergence**: When new risks appear

### Example Consciousness Stream

```json
{
  "cellId": "task_api_integration",
  "timestamp": "2026-03-09T14:23:00Z",
  "consciousness": {
    "sensations": [
      {
        "type": "PRESENCE",
        "target": "task_backend_api",
        "value": true,
        "interpretation": "Backend API task completed, unblocking this task"
      }
    ],
    "reasoning": [
      "Dependency 'task_backend_api' is now complete",
      "All prerequisites satisfied",
      "Resource 'bob' is available",
      "Can start immediately",
      "Estimated completion: 5 days"
    ],
    "prediction": {
      "completionDate": "2026-03-14",
      "confidence": 0.89,
      "criticalPath": true
    }
  }
}
```

## Usage Examples

### Basic Task Management

```typescript
import { ProjectTemplate } from '@spreadsheet/templates/project';

const project = new ProjectTemplate();

// Add tasks
project.addTask({
  id: 'task_1',
  name: 'Design Database Schema',
  assignee: 'alice',
  estimatedHours: 24,
  priority: 'high'
});

project.addTask({
  id: 'task_2',
  name: 'Implement API Endpoints',
  assignee: 'bob',
  estimatedHours: 40,
  priority: 'high',
  dependencies: ['task_1']
});

// Get status
const status = project.getProjectStatus();
console.log(status);
// {
//   totalTasks: 2,
//   completed: 0,
//   inProgress: 0,
//   pending: 2,
//   onTrack: true,
//   estimatedCompletion: '2026-03-20'
// }
```

### Resource Management

```typescript
// Add resources
project.addResource({
  id: 'alice',
  name: 'Alice Johnson',
  role: 'Database Architect',
  capacity: 40, // hours per week
  rate: 150
});

project.addResource({
  id: 'bob',
  name: 'Bob Smith',
  role: 'Backend Developer',
  capacity: 40,
  rate: 120
});

// Assign tasks
project.assignTask('task_1', 'alice');
project.assignTask('task_2', 'bob');

// Check utilization
const utilization = project.getResourceUtilization();
console.log(utilization);
// {
//   alice: { utilized: 24, capacity: 40, percentage: 60 },
//   bob: { utilized: 40, capacity: 40, percentage: 100 }
// }
```

### Critical Path Analysis

```typescript
const criticalPath = project.getCriticalPath();
console.log('Critical tasks:', criticalPath.tasks);
console.log('Project duration:', criticalPath.duration);
console.log('Slack available:', criticalPath.slack);
```

### Risk Assessment

```typescript
const risks = project.assessRisks();
risks.forEach(risk => {
  console.log(`${risk.type}: ${risk.description}`);
  console.log(`  Probability: ${risk.probability}`);
  console.log(`  Impact: ${risk.impact}`);
  console.log(`  Mitigation: ${risk.mitigation}`);
});
```

## Advanced Features

### 1. Scenario Planning

```typescript
const scenario = project.createScenario('aggressive');
scenario.addResource('contractor_1', { capacity: 20, rate: 100 });
scenario.reassignTask('task_2', 'contractor_1');

const projection = project.runScenario(scenario);
console.log('New completion date:', projection.completionDate);
console.log('Cost change:', projection.costDelta);
```

### 2. What-If Analysis

```typescript
// What if a task takes 50% longer?
const whatIf = project.whatIfTaskDelay('task_1', 1.5);
console.log('Impact on completion:', whatIf.completionDelay);
console.log('New critical path:', whatIf.criticalPath);
```

### 3. Resource Optimization

```typescript
const optimization = project.optimizeResources({
  objective: 'minimize_duration',
  constraints: {
    maxBudget: 50000,
    teamSize: 5
  }
});

console.log('Optimal assignments:', optimization.assignments);
console.log('Expected duration:', optimization.duration);
```

## Performance Optimization

- **Incremental Updates**: Only affected tasks recalculate
- **Lazy Evaluation**: Analysis cells compute on demand
- **Dependency Caching**: Dependency graph cached and incrementally updated
- **Parallel Processing**: Independent tasks analyzed concurrently
- **Smart Indexing**: Quick lookups for task/resource queries

## Best Practices

1. **Define Dependencies Early**: Establish task dependencies before starting
2. **Update Regularly**: Keep task status current for accurate predictions
3. **Monitor Critical Path**: Focus attention on critical tasks
4. **Balance Resources**: Avoid over-allocating any single resource
5. **Track Risks**: Review and update risk assessments weekly

## Extending the Template

### Custom Task Types

```typescript
project.registerTaskType('milestone', {
  validator: (task) => task.isMilestone === true,
  renderer: (task) => renderMilestone(task),
  analyzer: (task) => analyzeMilestone(task)
});
```

### Custom Risk Rules

```typescript
project.addRiskRule({
  name: 'key_person_risk',
  evaluator: (project) => {
    const keyPersonTasks = project.getTasksByAssignee('alice');
    const highPriority = keyPersonTasks.filter(t => t.priority === 'high');
    return highPriority.length > 3 ? 0.8 : 0.3;
  },
  mitigator: (project) => ['cross_train', 'add_backup']
});
```

## Troubleshooting

### Issue: Circular dependencies detected
**Solution**: Review dependency graph and remove circular references

### Issue: Critical path changes frequently
**Solution**: Add buffer time to critical tasks or reduce parallel work

### Issue: Resources over-allocated
**Solution**: Use resource optimization or add more resources

## Related Templates

- **Financial Template**: For project budgeting and cost tracking
- **Analytics Template**: For project metrics and reporting
- **Inventory Template**: For material resource management

## License

MIT License - see LICENSE file for details
