/**
 * Analytics Reports Generator
 * Generates daily, weekly, and monthly reports from analytics data
 */

export interface ReportData {
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  events: {
    [key: string]: {
      count: number;
      uniqueSessions: number;
      properties?: any[];
    };
  };
  pageViews: {
    path: string;
    views: number;
    uniqueVisits: number;
  }[];
  engagement: {
    avgDuration: number;
    bounceRate: number;
    scrollDepth50plus: number;
    scrollDepth75plus: number;
    scrollDepth100: number;
    time30splus: number;
    time2mplus: number;
    time5mplus: number;
  };
  demographics: {
    topCountries: { country: string; visitors: number }[];
    screenResolutions: { resolution: string; usage: number }[];
    referrers: { referrer: string; visits: number }[];
  };
  learningMetrics: {
    tutorialsStarted: number;
    tutorialsCompleted: number;
    ageGroupSelections: { group: string; count: number }[];
    demoInteractions: number;
    quizAttempts: number;
    quizCompletions: number;
    whitePaperDownloads: number;
  };
  performance: {
    avgLoadTime: number;
    errorCount: number;
    offlineModeActivations: number;
  };
}

export class AnalyticsReportGenerator {
  /**
   * Generate a daily report
   */
  static generateDailyReport(data: any[]): ReportData {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = data.filter(e => e.timestamp.startsWith(today));

    return this.generateReport(todayEvents, 'daily', today);
  }

  /**
   * Generate a weekly report
   */
  static generateWeeklyReport(data: any[]): ReportData {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekDate = weekAgo.toISOString().split('T')[0];
    const weekEvents = data.filter(e => e.timestamp >= weekDate);

    return this.generateReport(weekEvents, 'weekly', weekDate);
  }

  /**
   * Generate a monthly report
   */
  static generateMonthlyReport(data: any[]): ReportData {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthDate = monthAgo.toISOString().split('T')[0];
    const monthEvents = data.filter(e => e.timestamp >= monthDate);

    return this.generateReport(monthEvents, 'monthly', monthDate);
  }

  /**
   * Generate a learning progress report
   */
  static generateLearningReport(events: any[]): string {
    const tutorials = this.extractTutorials(events);
    const quizzes = this.extractQuizzes(events);
    const demos = this.extractDemoInteractions(events);

    let report = `# Learning Analytics Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Tutorial Progress
    report += `## Tutorial Progress\n`;
    report += `- Tutorials Started: ${tutorials.started.length}\n`;
    report += `- Tutorials Completed: ${tutorials.completed.length}\n`;
    report += `- Completion Rate: ${tutorials.started.length > 0 ? ((tutorials.completed.length / tutorials.started.length) * 100).toFixed(1) : 0}%\n\n`;

    // Most Popular Tutorials
    const popularTutorials = this.getMostPopularTutorials(tutorials.started);
    report += `### Most Popular Tutorials\n`;
    popularTutorials.slice(0, 5).forEach(tutorial => {
      report += `- ${tutorial.title}: ${tutorial.count} starts\n`;
    });
    report += '\n';

    // Quiz Performance
    report += `## Quiz Performance\n`;
    report += `- Total Attempts: ${quizzes.attempts.length}\n`;
    report += `- Successful Completions: ${quizzes.completions.length}\n`;
    report += `- Average Score: ${this.calculateAverageScore(quizzes.attempts).toFixed(1)}%\n\n`;

    // Demo Interactions
    report += `## Demo Interactions\n`;
    report += `- Total Interactions: ${demos.length}\n`;
    const uniqueDemoTypes = [...new Set(demos.map(d => d.type))];
    report += `- Demo Types: ${uniqueDemoTypes.join(', ')}\n\n`;

    // Age Group Distribution
    const ageGroups = this.getAgeGroupDistribution(events);
    report += `## Age Group Distribution\n`;
    Object.entries(ageGroups).forEach(([group, count]) => {
      report += `- ${group}: ${count} selections\n`;
    });

    // Insights
    report += `\n## Insights\n`;
    report += this.generateLearningInsights(tutorials, quizzes, demos);

    return report;
  }

  /**
   * Generate data-driven recommendations
   */
  static generateRecommendations(events: any[]): string[] {
    const recommendations: string[] = [];
    const learningMetrics = this.extractLearningMetrics(events);

    // Low tutorial completion rate
    if (learningMetrics.tutorialCompletionRate < 0.5) {
      recommendations.push('Consider simplifying tutorial complexity or adding more interactive elements');
    }

    // High quiz failure rate
    if (learningMetrics.quizfailureRate > 0.3) {
      recommendations.push('Review quiz questions for clarity and consider adding more hints');
    }

    // Age group concentration
    const topAgeGroup = Object.entries(learningMetrics.ageGroups)
      .sort(([,a], [,b]) => b - a)[0][0];

    recommendations.push(`Your highest engagement is from ${topAgeGroup} users - consider creating more content for this group`);

    // Low demo interaction
    if (learningMetrics.demoInteractions < learningMetrics.visitors * 0.5) {
      recommendations.push('Make demos more discoverable on the homepage');
    }

    // Mobile usage
    const mobileRatio = events.filter(e => e.properties?.viewport?.includes('768')).length / events.length;
    if (mobileRatio > 0.6) {
      recommendations.push('High mobile usage detected - ensure all demos work well on touch devices');
    }

    return recommendations;
  }

  /**
   * Extract tutorial events
   */
  private static extractTutorials(events: any[]) {
    const tutorials = {
      started: events.filter(e => e.name === ANALYTICS_EVENTS.TUTORIAL_START),
      completed: events.filter(e => e.name === ANALYTICS_EVENTS.TUTORIAL_COMPLETE),
      lessonViews: events.filter(e => e.name === 'tutorial_lesson_viewed'),
      lessonCompletions: events.filter(e => e.name === 'tutorial_lesson_completed')
    };

    return tutorials;
  }

  /**
   * Get most popular tutorials
   */
  private static getMostPopularTutorials(startedEvents: any[]) {
    const tutorialCounts: Map<string, number> = new Map();

    startedEvents.forEach(event => {
      const lessonId = event.properties?.lesson_id || 'unknown';
      tutorialCounts.set(lessonId, (tutorialCounts.get(lessonId) || 0) + 1);
    });

    return Array.from(tutorialCounts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Extract quiz events
   */
  private static extractQuizzes(events: any[]) {
    const quizEvents = events.filter(e => e.name.startsWith('quiz_'));

    return {
      attempts: quizEvents.filter(e => e.name === ANALYTICS_EVENTS.QUIZ_STARTED),
      completions: quizEvents.filter(e => e.name === ANALYTICS_EVENTS.QUIZ_COMPLETED),
      submissions: quizEvents.filter(e => e.name === 'quiz_answer_submitted')
    };
  }

  /**
   * Extract demo interactions
   */
  private static extractDemoInteractions(events: any[]) {
    return events.filter(e =>
      e.name === ANALYTICS_EVENTS.SPREADSHEET_DEMO_OPENED ||
      e.name === ANALYTICS_EVENTS.INTERACTIVE_VISUALIZATION_USED ||
      e.name === ANALYTICS_EVENTS.CONFIDENCE_CASCADE_TRIGGERED ||
      e.name === ANALYTICS_EVENTS.PYTHAGOREAN_CALCULATOR_USED ||
      e.name === ANALYTICS_EVENTS.RATE_BASED_CHANGE_SIMULATED
    );
  }

  /**
   * Calculate average quiz score
   */
  private static calculateAverageScore(attempts: any[]): number {
    const scores = attempts
      .filter(a => a.properties?.score !== undefined)
      .map(a => a.properties.score);

    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length * 100;
  }

  /**
   * Get age group distribution
   */
  private static getAgeGroupDistribution(events: any[]) {
    const ageGroupEvents = events.filter(e => e.name === ANALYTICS_EVENTS.AGE_GROUP_SELECTED);
    const distribution: Record<string, number> = {};

    ageGroupEvents.forEach(event => {
      const group = event.properties?.age_group || 'unknown';
      distribution[group] = (distribution[group] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Extract learning metrics
   */
  private static extractLearningMetrics(events: any[]) {
    const visitors = new Set(events.map(e => e.sessionId)).size;
    const tutorials = this.extractTutorials(events);
    const quizzes = this.extractQuizzes(events);
    const demos = this.extractDemoInteractions(events);
    const ageGroups = this.getAgeGroupDistribution(events);

    return {
      visitors,
      tutorialCompletionRate: tutorials.started.length > 0
        ? tutorials.completed.length / tutorials.started.length
        : 0,
      quizFailureRate: quizzes.attempts.length > 0
        ? (quizzes.attempts.length - quizzes.completions.length) / quizzes.attempts.length
        : 0,
      demoInteractions: demos.length,
      ageGroups
    };
  }

  /**
   * Generate learning insights
   */
  private static generateLearningInsights(tutorials: any, quizzes: any, demos: any[]): string {
    const insights: string[] = [];

    // Tutorial insights
    if (tutorials.completed.length / tutorials.started.length > 0.7) {
      insights.push('Users are highly engaged with tutorials with a completion rate over 70%');
    } else if (tutorials.completed.length / tutorials.started.length < 0.3) {
      insights.push('Consider improving tutorial engagement - less than 30% complete the full course');
    }

    // Quiz insights
    if (quizzes.attempts.length > 0) {
      const successRate = quizzes.completions.length / quizzes.attempts.length;
      insights.push(`Quiz success rate: ${(successRate * 100).toFixed(1)}%`);
    }

    // Demo insights
    if (demos.length > 5) {
      insights.push('Users are actively engaging with interactive demos');
    }

    return insights.join('\n- ');
  }

  /**
   * Generate the main report
   */
  private static generateReport(events: any[], period: 'daily' | 'weekly' | 'monthly', startDate: string): ReportData {
    const uniqueSessions = new Set(events.map(e => e.sessionId));
    const pageEvents = events.filter(e => e.name === 'pageview');
    const engagement = this.calculateEngagement(events);
    const demographics = this.extractDemographics(events);
    const learningMetrics = this.extractLearningMetrics(events);
    const performance = this.extrackPerformance(events);

    return {
      period,
      date: startDate,
      events: this.aggregateEvents(events),
      pageViews: this.aggregatePageViews(pageEvents),
      engagement,
      demographics,
      learningMetrics,
      performance
    };
  }

  /**
   * Calculate engagement metrics
   */
  private static calculateEngagement(events: any[]) {
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

    return {
      avgDuration: this.calculateAverageDuration(events),
      bounceRate: this.calculateBounceRate(events),
      scrollDepth50plus: events.filter(e => e.name === ANALYTICS_EVENTS.SCROLL_DEPTH_50).length,
      scrollDepth75plus: events.filter(e => e.name === ANALYTICS_EVENTS.SCROLL_DEPTH_75).length,
      scrollDepth100: events.filter(e => e.name === ANALYTICS_EVENTS.SCROLL_DEPTH_100).length,
      time30splus: events.filter(e => e.name === ANALYTICS_EVENTS.TIME_ON_PAGE_30S).length,
      time2mplus: events.filter(e => e.name === ANALYTICS_EVENTS.TIME_ON_PAGE_2M).length,
      time5mplus: events.filter(e => e.name === ANALYTICS_EVENTS.TIME_ON_PAGE_5M).length
    };
  }

  /**
   * Aggregate events by name
   */
  private static aggregateEvents(events: any[]) {
    const aggregated: any = {};

    events.forEach(event => {
      if (!aggregated[event.name]) {
        aggregated[event.name] = {
          count: 0,
          uniqueSessions: new Set(),
          properties: []
        };
      }

      aggregated[event.name].count++;
      aggregated[event.name].uniqueSessions.add(event.sessionId);

      if (event.properties) {
        aggregated[event.name].properties.push(event.properties);
      }
    });

    // Convert Sets to counts
    Object.keys(aggregated).forEach(key => {
      aggregated[key].uniqueSessions = aggregated[key].uniqueSessions.size;
    });

    return aggregated;
  }

  /**
   * Calculate average duration (simplified)
   */
  private static calculateAverageDuration(events: any[]): number {
    // Simple estimation based on time on page events
    return events.filter(e => e.name.includes('time_on_page')).length * 30;
  }

  /**
   * Calculate bounce rate (simplified)
   */
  private static calculateBounceRate(events: any[]): number {
    const sessions = new Set(events.map(e => e.sessionId));
    let bounceCount = 0;

    sessions.forEach(sessionId => {
      const sessionEvents = events.filter(e => e.sessionId === sessionId);
      if (sessionEvents.length <= 1) {
        bounceCount++;
      }
    });

    return sessions.size > 0 ? (bounceCount / sessions.size) * 100 : 0;
  }

  /**
   * Extract demographics
   */
  private static extractDemographics(events: any[]) {
    const countryCounts = {};
    const resolutionCounts = {};
    const referrerCounts = {};

    events.forEach(event => {
      // Countries (from country field)
      countryCounts[event.country] = (countryCounts[event.country] || 0) + 1;

      // Screen resolutions
      const resolution = event.properties?.screenResolution;
      if (resolution) {
        resolutionCounts[resolution] = (resolutionCounts[resolution] || 0) + 1;
      }

      // Referrers
      const referrer = event.properties?.referrer;
      if (referrer) {
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
      }
    });

    return {
      topCountries: Object.entries(countryCounts).map(([country, visitors]) => ({ country, visitors } as any)).sort((a, b) => b.visitors - a.visitors).slice(0, 5),
      screenResolutions: Object.entries(resolutionCounts).map(([resolution, usage]) => ({ resolution, usage } as any)).sort((a, b) => b.usage - a.usage).slice(0, 5),
      referrers: Object.entries(referrerCounts).map(([referrer, visits]) => ({ referrer, visits } as any)).sort((a, b) => b.visits - a.visits).slice(0, 5)
    };
  }

  /**
   * Aggregate page views
   */
  private static aggregatePageViews(pageEvents: any[]) {
    const pageCounts = {};
    const uniquePageSessions = {};

    pageEvents.forEach(event => {
      const path = event.path || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;

      if (!uniquePageSessions[path]) {
        uniquePageSessions[path] = new Set();
      }
      uniquePageSessions[path].add(event.sessionId);
    });

    return Object.entries(pageCounts).map(([path, views]) => ({
      path,
      views,
      uniqueVisits: uniquePageSessions[path].size
    })).sort((a, b) => b.views - a.views);
  }

  /**
   * Extract performance metrics
   */
  private static extrackPerformance(events: any[]) {
    return {
      avgLoadTime: Math.random() * 3000 + 1000, // Placeholder
      errorCount: events.filter(e => e.name === ANALYTICS_EVENTS.ERROR_OCCURRED).length,
      offlineModeActivations: events.filter(e => e.name === ANALYTICS_EVENTS.OFFLINE_MODE_ACTIVATED).length
    };
  }
}

// Import analytics events
import { ANALYTICS_EVENTS } from './analytics';