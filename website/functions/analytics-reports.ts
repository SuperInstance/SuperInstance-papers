/**
 * Cloudflare Worker for Analytics Reports
 * Generates and sends daily/weekly analytics reports
 */

import { AnalyticsReportGenerator } from '../src/lib/analytics-reports';

export interface Env {
  ANALYTICS_D1: D1Database;
  WEBHOOK_URL: string;
  EMAIL_API_KEY: string;
  REPORT_SENDER_EMAIL: string;
  REPORT_RECIPIENT_EMAIL: string;
}

/**
 * Scheduled event handler for daily reports
 */
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const date = new Date(event.scheduledTime);
  const dateStr = date.toISOString().split('T')[0];

  // Generate report at 2 AM UTC each day
  if (date.getUTCHours() === 2) {
    try {
      await generateDailyReport(env, dateStr);
    } catch (error) {
      console.error('Failed to generate daily report:', error);
    }
  }

  // Generate weekly report on Sunday at 3 AM UTC
  if (date.getUTCDay() === 0 && date.getUTCHours() === 3) {
    try {
      await generateWeeklyReport(env);
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
    }
  }
}

/**
 * HTTP handler for on-demand report generation
 */
export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reportType = url.searchParams.get('type') || 'daily';
  const startDate = url.searchParams.get('start_date');

  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://superinstance.ai',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let report;

    switch (reportType) {
      case 'daily':
        const date = startDate || new Date().toISOString().split('T')[0];
        report = await generateDailyReport(env, date);
        break;

      case 'weekly':
        report = await generateWeeklyReport(env);
        break;

      case 'learning':
        report = await generateLearningReport(env);
        break;

      default:
        return new Response('Invalid report type', { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ report, generated: new Date().toISOString() }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
}

/**
 * Generate daily report
 */
async function generateDailyReport(env: Env, date: string): Promise<string> {
  // Fetch yesterday's analytics data
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { results: events } = await env.ANALYTICS_D1.prepare(`
    SELECT * FROM analytics_events
    WHERE timestamp >= ? AND timestamp < ?
    ORDER BY timestamp DESC
  `).bind(yesterdayStr, date).all();

  // Generate report
  const report = AnalyticsReportGenerator.generateDailyReport(events);
  const summary = this.formatDailyReport(report);

  // Send email notification
  await sendDailyEmail(env, summary, yesterdayStr, events.length);

  // Send to Slack if configured
  if (env.WEBHOOK_URL) {
    await sendSlackNotification(env.WEBHOOK_URL, {
      type: 'daily',
      date: yesterdayStr,
      summary: report
    });
  }

  return summary;
}

/**
 * Generate weekly report
 */
async function generateWeeklyReport(env: Env): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { results: events } = await env.ANALYTICS_D1.prepare(`
    SELECT * FROM analytics_events
    WHERE timestamp >= ? AND timestamp < ?
    ORDER BY timestamp DESC
  `).bind(weekAgo, today).all();

  const report = AnalyticsReportGenerator.generateWeeklyReport(events);
  const summary = this.formatWeeklyReport(report);

  // Send email
  await sendWeeklyEmail(env, summary, weekAgo, today, events.length);

  return summary;
}

/**
 * Generate learning-focused report
 */
async function generateLearningReport(env: Env): Promise<string> {
  const { results: events } = await env.ANALYTICS_D1.prepare(`
    SELECT * FROM analytics_events
    WHERE (name LIKE '%tutorial%' OR name LIKE '%quiz%' OR name LIKE '%demo%' OR name = 'age_group_selected')
    AND timestamp >= date('now', '-30 days')
    ORDER BY timestamp DESC
  `).all();

  return AnalyticsReportGenerator.generateLearningReport(events);
}

/**
 * Format daily report for email
 */
private static formatDailyReport(report: any): string {
  return `
# ${report.period.toUpperCase()} Analytics Report - ${report.date}

## Overview
- **Total Events**: ${Object.values(report.events).reduce((sum: number, e: any) => sum + e.count, 0).toLocaleString()}
- **Unique Visitors**: ${new Set(report.events).size}
- **Page Views**: ${report.events.pageview?.count || 0}
- **Average Time on Site**: ${Math.round(report.engagement.avgDuration / 60)}m ${report.engagement.avgDuration % 60}s

## Top Content
${report.pageViews.slice(0, 5).map((page: any) => `- ${page.path}: ${page.views.toLocaleString()} views`).join('\n')}

## Popular Events
${Object.entries(report.events)
  .sort(([,a]: any, [,b]: any) => b.count - a.count)
  .slice(0, 5)
  .map(([name, data]: any) => `- ${name.replace('_', ' ')}: ${data.count.toLocaleString()} events`)
  .join('\n')}

## Learning Metrics
- Tutorials Started: ${report.learningMetrics.tutorialsStarted}
- Demos Used: ${report.learningMetrics.demoInteractions}
- Age Groups Selected: ${report.learningMetrics.ageGroupSelections.reduce((sum: number, g: any) => sum + g.count, 0)}

## Recommendations
${AnalyticsReportGenerator.generateRecommendations([]).join('\n- ')}
`;
}

/**
 * Format weekly report for email
 */
private static formatWeeklyReport(report: any): string {
  const previousWeek = Object.entries(report.events)
    .reduce((sum: number, [,e]: any) => sum + e.count, 0);

  return `
# WEEKLY Analytics Report (${report.date} to ${new Date().toISOString().split('T')[0]})

## Week Summary
- **Total Events**: ${previousWeek.toLocaleString()}
- **Unique Visitors**: ${Object.values(report.events)
    .reduce((sum: any, e: any) => sum + e.uniqueSessions, 0)}
- **Average Engagement**: ${Math.round(report.engagement.avgDuration / 60)} minutes
- **Bounce Rate**: ${report.engagement.bounceRate.toFixed(1)}%

## Learning Analytics
- Tutorial Completions: ${report.learningMetrics.tutorialsCompleted}
- Quiz Completions: ${report.learningMetrics.quizCompletions}
- Demo Interactions: ${report.learningMetrics.demoInteractions}
- White Paper Downloads: ${report.learningMetrics.whitePaperDownloads}

## Geographic Distribution
${report.demographics.topCountries.map((c: any) => `- ${c.country}: ${c.visitors} visitors`).join('\n')}

## Trends
- Scroll Depth (50%+): ${report.engagement.scrollDepth50plus} sessions
- Time on Page (2+ minutes): ${report.engagement.time2mplus} sessions
- Mobile Usage: ${Math.round((report.events.filter((e: any) =>
    e.properties?.viewport?.includes('768')).length / (previousWeek || 1)) * 100)}%

## Action Items
${AnalyticsReportGenerator.generateRecommendations([]).join('\n- ')}
`;
}

/**
 * Send daily email report
 */
async function sendDailyEmail(env: Env, report: string, date: string, totalEvents: number) {
  const subject = `SuperInstance.AI Daily Analytics - ${date}`;
  const body = {
    from: env.REPORT_SENDER_EMAIL,
    to: env.REPORT_RECIPIENT_EMAIL,
    subject,
    text: report,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #3b82f6;">SuperInstance.AI Daily Analytics Report</h2>
          <p>Date: ${date}</p>
          <p>Total Events Tracked: ${totalEvents.toLocaleString()}</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${report.replace(/\n/g, '<br>').replace(/^# /gm, '<h3 style="color: #3b82f6;">').replace(/#.*$/gm, '$&</h3>')}
          </div>
          <p style="font-size: 12px; color: #666;">
            This report is generated automatically. To update preferences, contact the administrator.
          </p>
        </body>
      </html>
    `
  };

  // In a real implementation, you would send via your email API
  console.log('Would send daily email:', body);
}

/**
 * Send weekly email report
 */
async function sendWeeklyEmail(env: Env, report: string, weekStart: string, weekEnd: string, totalEvents: number) {
  const subject = `SuperInstance.AI Weekly Analytics - Week of ${weekStart}`;
  const body = {
    from: env.REPORT_SENDER_EMAIL,
    to: env.REPORT_RECIPIENT_EMAIL,
    subject,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #8b5cf6;">SuperInstance.AI Weekly Analytics Report</h2>
          <p>Week of ${weekStart} to ${weekEnd}</p>
          <p>Total Events Tracked: ${totalEvents.toLocaleString()}</p>
          <div style="background: #f8f5ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${report.replace(/\n/g, '<br>').replace(/^# /gm, '<h3 style="color: #8b5cf6;">').replace(/#.*$/gm, '$&</h3>')}
          </div>
          <p style="font-size: 12px; color: #666;">
            This report is generated automatically. To update preferences, contact the administrator.
          </p>
        </body>
      </html>
    `
  };

  console.log('Would send weekly email:', body);
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(webhookUrl: string, data: any) {
  const emoji = data.type === 'daily' ? '📊' : '📈';
  const message = {
    text: `${emoji} SuperInstance.AI ${data.type} analytics report generated for ${data.date}`,
    attachments: [
      {
        color: data.type === 'daily' ? 'good' : '#8b5cf6',
        fields: [
          {
            title: 'Total Events',
            value: data.summary.totalEvents || 'N/A',
            short: true
          },
          {
            title: 'Unique Visitors',
            value: data.summary.uniqueVisitors || 'N/A',
            short: true
          },
          {
            title: 'Top Page',
            value: data.summary.topPage || 'N/A',
            short: true
          },
          {
            title: 'Tutorial Completions',
            value: data.summary.tutorialCompletions || 'N/A',
            short: true
          }
        ],
        footer: 'SuperInstance.AI Analytics',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}