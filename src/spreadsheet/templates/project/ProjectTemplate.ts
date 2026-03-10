/**
 * Project Management Template - Comprehensive Project Management with POLLN
 *
 * Demonstrates:
 * - Task tracking with dependencies
 * - Resource allocation and utilization
 * - Timeline visualization (Gantt chart)
 * - Critical path analysis
 * - Risk assessment and mitigation
 * - Milestone tracking
 * - Progress prediction
 * - What-if scenario analysis
 */

import { LogCell, CellHead, CellBody, CellTail, CellOrigin } from '../../core/LogCell';
import { InputCell } from '../../cells/InputCell';
import { OutputCell } from '../../cells/OutputCell';
import { TransformCell } from '../../cells/TransformCell';
import { AggregateCell } from '../../cells/AggregateCell';
import { AnalysisCell } from '../../cells/AnalysisCell';
import { PredictionCell } from '../../cells/PredictionCell';
import { DecisionCell } from '../../cells/DecisionCell';
import { ValidateCell } from '../../cells/ValidateCell';
import { SensationType } from '../../types/SensationType';
import { Collocator } from '../../core/Collocator';
import { ConsciousnessStream } from '../../core/ConsciousnessStream';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee?: string;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  tags?: string[];
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  capacity: number; // hours per week
  rate: number; // hourly rate
  skills: string[];
  availability: { [date: string]: number }; // hours available
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  dependencies: string[];
  status: 'pending' | 'completed' | 'delayed';
}

export interface Risk {
  id: string;
  type: 'schedule' | 'resource' | 'scope' | 'budget' | 'quality';
  description: string;
  probability: number;
  impact: number;
  mitigation?: string;
}

export interface CriticalPathAnalysis {
  tasks: string[];
  duration: number; // in days
  slack: { [taskId: string]: number };
  criticality: 'high' | 'medium' | 'low';
}

export class ProjectTemplate {
  private colony: Collocator;
  private tasks: Map<string, InputCell> = new Map();
  private resources: Map<string, InputCell> = new Map();
  private milestones: Map<string, DecisionCell> = new Map();
  private analysisCells: Map<string, AnalysisCell> = new Map();
  private predictionCells: Map<string, PredictionCell> = new Map();
  private decisionCells: Map<string, DecisionCell> = new Map();
  private consciousness: ConsciousnessStream;

  constructor() {
    this.colony = new Collocator('project_template');
    this.consciousness = new ConsciousnessStream('project_template');
    this.initializeTemplate();
  }

  private initializeTemplate(): void {
    this.initializeTaskTracking();
    this.initializeResourceManagement();
    this.initializeTimelineManagement();
    this.initializeRiskManagement();
  }

  private initializeTaskTracking(): void {
    // Task completion aggregator
    const taskCompletion = new AggregateCell({
      id: 'task_completion_tracker',
      name: 'Task Completion Tracker',
      aggregationType: 'weighted_average',
      sourceCellIds: [],
      sensations: [
        {
          targetId: 'task_completion_tracker',
          type: SensationType.RATE_OF_CHANGE,
          threshold: 0.05,
          interpretation: 'Task completion rate changed significantly'
        }
      ]
    });

    // Task status analysis
    const taskStatusAnalysis = new AnalysisCell({
      id: 'task_status_analysis',
      name: 'Task Status Analysis',
      analysisType: 'status_distribution',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Completion prediction
    const completionPrediction = new PredictionCell({
      id: 'project_completion_prediction',
      name: 'Project Completion Prediction',
      predictionModel: 'monte_carlo',
      sourceCellIds: ['task_completion_tracker'],
      horizon: 90,
      confidenceInterval: 0.90
    });

    this.colony.addCell(taskCompletion);
    this.colony.addCell(taskStatusAnalysis);
    this.colony.addCell(completionPrediction);
    this.analysisCells.set('task_status', taskStatusAnalysis);
    this.predictionCells.set('completion', completionPrediction);
  }

  private initializeResourceManagement(): void {
    // Resource utilization analyzer
    const resourceUtilization = new AnalysisCell({
      id: 'resource_utilization_analyzer',
      name: 'Resource Utilization Analyzer',
      analysisType: 'utilization',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Resource conflict detector
    const conflictDetector = new DecisionCell({
      id: 'resource_conflict_detector',
      name: 'Resource Conflict Detector',
      decisionLogic: (context) => {
        const assignments = context.getValue('task_assignments') || [];
        const conflicts = this.detectConflicts(assignments);

        return {
          decision: conflicts.length > 0 ? 'CONFLICT' : 'OK',
          confidence: 0.95,
          reasoning: `Found ${conflicts.length} resource conflicts`,
          actions: conflicts.length > 0 ? ['resolve_conflicts', 'notify_manager'] : []
        };
      }
    });

    // Resource optimization
    const resourceOptimizer = new AnalysisCell({
      id: 'resource_optimization',
      name: 'Resource Optimization Analyzer',
      analysisType: 'optimization',
      sourceCellIds: ['resource_utilization_analyzer'],
      consciousness: {
        enabled: true
      }
    });

    this.colony.addCell(resourceUtilization);
    this.colony.addCell(conflictDetector);
    this.colony.addCell(resourceOptimizer);
    this.analysisCells.set('resource_utilization', resourceUtilization);
    this.decisionCells.set('resource_conflict', conflictDetector);
  }

  private initializeTimelineManagement(): void {
    // Critical path analyzer
    const criticalPathAnalyzer = new AnalysisCell({
      id: 'critical_path_analyzer',
      name: 'Critical Path Analyzer',
      analysisType: 'critical_path',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Gantt chart transformer
    const ganttChart = new TransformCell({
      id: 'gantt_chart_generator',
      name: 'Gantt Chart Generator',
      transformFunction: (inputs: Map<string, any>) => {
        const tasks = inputs.get('tasks') || [];
        return this.generateGanttData(tasks);
      },
      sourceCellIds: []
    });

    // Schedule variance analyzer
    const scheduleVariance = new AnalysisCell({
      id: 'schedule_variance_analyzer',
      name: 'Schedule Variance Analyzer',
      analysisType: 'variance',
      sourceCellIds: [],
      consciousness: {
        enabled: true
      }
    });

    this.colony.addCell(criticalPathAnalyzer);
    this.colony.addCell(ganttChart);
    this.colony.addCell(scheduleVariance);
    this.analysisCells.set('critical_path', criticalPathAnalyzer);
    this.analysisCells.set('schedule_variance', scheduleVariance);
  }

  private initializeRiskManagement(): void {
    // Risk identifier
    const riskIdentifier = new AnalysisCell({
      id: 'risk_identifier',
      name: 'Risk Identifier',
      analysisType: 'risk_detection',
      sourceCellIds: ['task_status_analysis', 'resource_utilization_analyzer', 'schedule_variance_analyzer'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Risk probability assessor
    const riskAssessor = new PredictionCell({
      id: 'risk_probability_assessor',
      name: 'Risk Probability Assessor',
      predictionModel: 'bayesian',
      sourceCellIds: ['risk_identifier'],
      horizon: 30,
      confidenceInterval: 0.85
    });

    // Risk impact analyzer
    const impactAnalyzer = new TransformCell({
      id: 'risk_impact_analyzer',
      name: 'Risk Impact Analyzer',
      transformFunction: (inputs: Map<string, any>) => {
        const risks = inputs.get('identified_risks') || [];
        return this.analyzeRiskImpact(risks);
      },
      sourceCellIds: ['risk_identifier']
    });

    // Mitigation planner
    const mitigationPlanner = new DecisionCell({
      id: 'mitigation_planner',
      name: 'Mitigation Planner',
      decisionLogic: (context) => {
        const risks = context.getValue('assessed_risks') || [];
        const highRisks = risks.filter((r: Risk) => r.probability * r.impact > 0.5);

        return {
          decision: highRisks.length > 0 ? 'MITIGATE' : 'MONITOR',
          confidence: 0.90,
          reasoning: `${highRisks.length} high-priority risks detected`,
          actions: highRisks.map((r: Risk) => r.mitigation)
        };
      }
    });

    this.colony.addCell(riskIdentifier);
    this.colony.addCell(riskAssessor);
    this.colony.addCell(impactAnalyzer);
    this.colony.addCell(mitigationPlanner);
    this.analysisCells.set('risk_identification', riskIdentifier);
    this.predictionCells.set('risk', riskAssessor);
    this.decisionCells.set('mitigation', mitigationPlanner);
  }

  /**
   * Add a task to the project
   */
  public addTask(task: Task): void {
    const taskCell = new InputCell({
      id: `task_${task.id}`,
      name: task.name,
      value: task,
      validator: (value) => {
        const t = value as Task;
        return t.estimatedHours > 0 && t.priority in ['low', 'medium', 'high', 'critical'];
      },
      sensations: task.dependencies.map(dep => ({
        targetId: `task_${dep}`,
        type: SensationType.PRESENCE,
        threshold: 1,
        interpretation: `Wait for task ${dep} to complete`
      }))
    });

    this.tasks.set(task.id, taskCell);
    this.colony.addCell(taskCell);

    this.consciousness.log({
      type: 'task_added',
      taskId: task.id,
      name: task.name,
      priority: task.priority,
      dependencies: task.dependencies
    });

    // Update critical path
    this.updateCriticalPath();
  }

  /**
   * Update task status
   */
  public updateTaskStatus(taskId: string, status: Task['status'], actualHours?: number): void {
    const taskCell = this.tasks.get(taskId);
    if (taskCell) {
      const task = taskCell.getValue() as Task;
      task.status = status;
      if (actualHours !== undefined) {
        task.actualHours = actualHours;
      }
      if (status === 'completed') {
        task.completedDate = new Date();
      }
      taskCell.setValue(task);

      this.consciousness.log({
        type: 'task_status_updated',
        taskId: taskId,
        status: status,
        actualHours: actualHours
      });
    }
  }

  /**
   * Add a resource to the project
   */
  public addResource(resource: Resource): void {
    const resourceCell = new InputCell({
      id: `resource_${resource.id}`,
      name: resource.name,
      value: resource,
      validator: (value) => {
        const r = value as Resource;
        return r.capacity > 0 && r.rate >= 0;
      }
    });

    this.resources.set(resource.id, resourceCell);
    this.colony.addCell(resourceCell);

    this.consciousness.log({
      type: 'resource_added',
      resourceId: resource.id,
      name: resource.name,
      role: resource.role,
      capacity: resource.capacity
    });
  }

  /**
   * Assign a task to a resource
   */
  public assignTask(taskId: string, resourceId: string): void {
    const taskCell = this.tasks.get(taskId);
    if (taskCell) {
      const task = taskCell.getValue() as Task;
      task.assignee = resourceId;
      taskCell.setValue(task);

      this.consciousness.log({
        type: 'task_assigned',
        taskId: taskId,
        resourceId: resourceId
      });
    }
  }

  /**
   * Add a milestone
   */
  public addMilestone(milestone: Milestone): void {
    const milestoneCell = new DecisionCell({
      id: `milestone_${milestone.id}`,
      name: milestone.name,
      decisionLogic: (context) => {
        const dependencies = milestone.dependencies;
        const allComplete = dependencies.every(depId => {
          const taskCell = this.tasks.get(depId);
          if (!taskCell) return false;
          const task = taskCell.getValue() as Task;
          return task.status === 'completed';
        });

        return {
          decision: allComplete ? 'COMPLETE' : 'PENDING',
          confidence: allComplete ? 1.0 : 0.0,
          reasoning: allComplete ? 'All dependencies completed' : 'Waiting for dependencies',
          actions: allComplete ? ['celebrate', 'notify_stakeholders'] : []
        };
      }
    });

    this.milestones.set(milestone.id, milestoneCell);
    this.colony.addCell(milestoneCell);
  }

  /**
   * Get project status
   */
  public getProjectStatus(): any {
    const tasks = Array.from(this.tasks.values()).map(cell => cell.getValue() as Task);

    return {
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      onTrack: this.isProjectOnTrack(tasks)
    };
  }

  /**
   * Get resource utilization
   */
  public getResourceUtilization(): any {
    const utilization: any = {};

    this.resources.forEach((cell, resourceId) => {
      const resource = cell.getValue() as Resource;
      const assignedTasks = Array.from(this.tasks.values())
        .map(c => c.getValue() as Task)
        .filter(t => t.assignee === resourceId && t.status !== 'completed');

      const utilized = assignedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      const percentage = resource.capacity > 0 ? (utilized / resource.capacity) * 100 : 0;

      utilization[resourceId] = {
        utilized: utilized,
        capacity: resource.capacity,
        percentage: percentage,
        taskCount: assignedTasks.length
      };
    });

    return utilization;
  }

  /**
   * Get critical path analysis
   */
  public getCriticalPath(): CriticalPathAnalysis {
    const tasks = Array.from(this.tasks.values()).map(cell => cell.getValue() as Task);
    const graph = this.buildDependencyGraph(tasks);
    const criticalPath = this.findCriticalPath(graph, tasks);

    return {
      tasks: criticalPath.path,
      duration: criticalPath.duration,
      slack: criticalPath.slack,
      criticality: this.assessCriticality(criticalPath)
    };
  }

  /**
   * Assess project risks
   */
  public assessRisks(): Risk[] {
    const risks: Risk[] = [];
    const projectStatus = this.getProjectStatus();
    const utilization = this.getResourceUtilization();
    const criticalPath = this.getCriticalPath();

    // Schedule risk
    if (projectStatus.blocked > 0) {
      risks.push({
        id: 'schedule_blocked_tasks',
        type: 'schedule',
        description: `${projectStatus.blocked} tasks are blocked`,
        probability: 0.7,
        impact: 0.8,
        mitigation: 'Resolve blocking dependencies immediately'
      });
    }

    // Resource risk
    Object.values(utilization).forEach((u: any) => {
      if (u.percentage > 100) {
        risks.push({
          id: 'resource_overload',
          type: 'resource',
          description: `Resource over-allocated: ${u.percentage.toFixed(0)}%`,
          probability: 0.9,
          impact: 0.7,
          mitigation: 'Rebalance workload or add resources'
        });
      }
    });

    // Critical path risk
    if (criticalPath.criticality === 'high') {
      risks.push({
        id: 'critical_path_tight',
        type: 'schedule',
        description: 'Critical path has no slack',
        probability: 0.6,
        impact: 0.9,
        mitigation: 'Add buffer time to critical tasks'
      });
    }

    return risks;
  }

  /**
   * Create a scenario for what-if analysis
   */
  public createScenario(name: string): any {
    return {
      name: name,
      addResource: (resource: Resource) => {
        this.consciousness.log({
          type: 'scenario_resource',
          scenario: name,
          action: 'add_resource',
          resource: resource.id
        });
      },
      reassignTask: (taskId: string, resourceId: string) => {
        this.consciousness.log({
          type: 'scenario_reassign',
          scenario: name,
          task: taskId,
          to: resourceId
        });
      }
    };
  }

  /**
   * Run a scenario projection
   */
  public runScenario(scenario: any): any {
    const currentCompletion = this.predictionCells.get('completion')?.predict(90);
    const baseline = currentCompletion?.value || 90;

    return {
      completionDate: new Date(Date.now() + baseline * 24 * 60 * 60 * 1000),
      duration: baseline,
      costDelta: 0,
      confidence: 0.85
    };
  }

  /**
   * What-if analysis: what if a task is delayed?
   */
  public whatIfTaskDelay(taskId: string, delayMultiplier: number): any {
    const taskCell = this.tasks.get(taskId);
    if (!taskCell) return { error: 'Task not found' };

    const task = taskCell.getValue() as Task;
    const originalHours = task.estimatedHours;
    const newHours = originalHours * delayMultiplier;
    const delayDays = (newHours - originalHours) / 8; // Assuming 8-hour days

    const criticalPath = this.getCriticalPath();
    const onCriticalPath = criticalPath.tasks.includes(taskId);

    return {
      completionDelay: onCriticalPath ? delayDays : 0,
      criticalPath: onCriticalPath ? criticalPath.tasks : [],
      newHours: newHours,
      impact: onCriticalPath ? 'high' : 'low'
    };
  }

  /**
   * Optimize resource allocation
   */
  public optimizeResources(options: {
    objective: 'minimize_duration' | 'minimize_cost' | 'balance_workload';
    constraints: { maxBudget?: number; teamSize?: number };
  }): any {
    const utilization = this.getResourceUtilization();
    const optimization: any = {
      assignments: [],
      duration: 0,
      cost: 0
    };

    // Simple optimization: balance workload
    if (options.objective === 'balance_workload') {
      Object.entries(utilization).forEach(([resourceId, u]: [string, any]) => {
        if (u.percentage > 100) {
          optimization.assignments.push({
            action: 'reduce_load',
            resource: resourceId,
            currentLoad: u.percentage,
            targetLoad: 100
          });
        }
      });
    }

    return optimization;
  }

  /**
   * Get consciousness stream
   */
  public getConsciousness(): any[] {
    return this.consciousness.getStream();
  }

  /**
   * Export project state
   */
  public exportState(): any {
    return {
      tasks: Object.fromEntries(this.tasks),
      resources: Object.fromEntries(this.resources),
      milestones: Object.fromEntries(this.milestones),
      consciousness: this.consciousness.getStream()
    };
  }

  // Private helper methods

  private detectConflicts(assignments: any[]): any[] {
    const conflicts: any[] = [];
    // Simple conflict detection: same resource, overlapping time
    // In production, would use more sophisticated algorithm
    return conflicts;
  }

  private generateGanttData(tasks: Task[]): any {
    return {
      timeline: tasks.map(task => ({
        id: task.id,
        name: task.name,
        start: task.startDate || new Date(),
        end: task.dueDate || new Date(),
        progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
        assignee: task.assignee,
        dependencies: task.dependencies
      }))
    };
  }

  private analyzeRiskImpact(risks: Risk[]): any {
    return risks.map(risk => ({
      ...risk,
      severity: risk.probability * risk.impact,
      priority: risk.probability * risk.impact > 0.5 ? 'high' : 'medium'
    }));
  }

  private updateCriticalPath(): void {
    // Trigger critical path recalculation
    const analyzer = this.analysisCells.get('critical_path');
    if (analyzer) {
      analyzer.analyze();
    }
  }

  private buildDependencyGraph(tasks: Task[]): any {
    const graph: any = {};
    tasks.forEach(task => {
      graph[task.id] = {
        duration: task.estimatedHours / 8, // Convert to days
        dependencies: task.dependencies
      };
    });
    return graph;
  }

  private findCriticalPath(graph: any, tasks: Task[]): any {
    // Simplified critical path algorithm
    // In production, would use proper CPM algorithm
    const sortedTasks = this.topologicalSort(graph);
    const path: string[] = [];
    let duration = 0;
    const slack: { [taskId: string]: number } = {};

    sortedTasks.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        path.push(taskId);
        duration += task.estimatedHours / 8;
        slack[taskId] = 0; // All on critical path for simplicity
      }
    });

    return { path, duration, slack };
  }

  private topologicalSort(graph: any): string[] {
    // Simplified topological sort
    return Object.keys(graph);
  }

  private assessCriticality(criticalPath: any): 'high' | 'medium' | 'low' {
    const slackValues = Object.values(criticalPath.slack);
    const avgSlack = slackValues.reduce((a: number, b: number) => a + b, 0) / slackValues.length;
    if (avgSlack < 1) return 'high';
    if (avgSlack < 3) return 'medium';
    return 'low';
  }

  private isProjectOnTrack(tasks: Task[]): boolean {
    const behindSchedule = tasks.filter(t => {
      if (!t.dueDate || !t.actualHours) return false;
      const expectedProgress = (new Date().getTime() - new Date(t.startDate || Date.now()).getTime()) /
        (t.dueDate.getTime() - new Date(t.startDate || Date.now()).getTime());
      const actualProgress = t.actualHours / t.estimatedHours;
      return actualProgress < expectedProgress * 0.8;
    });
    return behindSchedule.length < tasks.length * 0.2;
  }

  /**
   * Generate sample project data
   */
  public static generateSampleData(): ProjectTemplate {
    const project = new ProjectTemplate();

    // Add resources
    project.addResource({
      id: 'alice',
      name: 'Alice Johnson',
      role: 'Backend Developer',
      capacity: 40,
      rate: 120,
      skills: ['python', 'database', 'api']
    });

    project.addResource({
      id: 'bob',
      name: 'Bob Smith',
      role: 'Frontend Developer',
      capacity: 40,
      rate: 110,
      skills: ['react', 'typescript', 'ui']
    });

    // Add tasks
    project.addTask({
      id: 'design_db',
      name: 'Design Database Schema',
      status: 'completed',
      assignee: 'alice',
      estimatedHours: 16,
      actualHours: 14,
      dependencies: [],
      priority: 'high'
    });

    project.addTask({
      id: 'create_api',
      name: 'Create REST API',
      status: 'in_progress',
      assignee: 'alice',
      estimatedHours: 40,
      actualHours: 24,
      dependencies: ['design_db'],
      priority: 'high'
    });

    project.addTask({
      id: 'design_ui',
      name: 'Design UI Mockups',
      status: 'completed',
      assignee: 'bob',
      estimatedHours: 24,
      actualHours: 26,
      dependencies: [],
      priority: 'medium'
    });

    project.addTask({
      id: 'implement_ui',
      name: 'Implement UI Components',
      status: 'in_progress',
      assignee: 'bob',
      estimatedHours: 48,
      actualHours: 30,
      dependencies: ['design_ui'],
      priority: 'high'
    });

    // Add milestone
    project.addMilestone({
      id: 'mvp',
      name: 'MVP Release',
      date: new Date('2026-04-01'),
      dependencies: ['create_api', 'implement_ui'],
      status: 'pending'
    });

    return project;
  }
}
