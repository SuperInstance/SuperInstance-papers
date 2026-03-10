/**
 * POLLN Spreadsheet UI - Compliance Dashboard
 *
 * React component for viewing compliance reports and summaries.
 * Supports SOC 2 Type II, GDPR, HIPAA, and other frameworks.
 *
 * Features:
 * - Compliance score visualization
 * - Report generation
 * - Framework-specific views
 * - Violation tracking
 * - Recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { ReportType, ReportFormat, ComplianceReport } from '../../backend/audit/ComplianceReporter';
import { AuditCategory, AuditSeverity } from '../../backend/audit/EventTypes';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ComplianceDashboardProps {
  apiBaseUrl?: string;
}

interface ComplianceMetrics {
  complianceScore: number;
  totalEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  violations: number;
  recommendations: string[];
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  apiBaseUrl = '/api/compliance',
}) => {
  // State
  const [reportType, setReportType] = useState<ReportType>(ReportType.SUMMARY);
  const [periodStart, setPeriodStart] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);

  // Fetch compliance report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        type: reportType,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        format: 'json',
      });

      const response = await fetch(`${apiBaseUrl}/reports?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReport(data);

      // Extract metrics
      setMetrics({
        complianceScore: data.summary.complianceScore || 0,
        totalEvents: data.summary.totalEvents || 0,
        criticalEvents: data.summary.criticalEvents || 0,
        highSeverityEvents: data.summary.highSeverityEvents || 0,
        violations: data.summary.violations || 0,
        recommendations: data.recommendations || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance report');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, reportType, periodStart, periodEnd]);

  // Export report
  const exportReport = async (format: ReportFormat) => {
    try {
      const queryParams = new URLSearchParams({
        type: reportType,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        format,
      });

      const response = await fetch(`${apiBaseUrl}/reports/export?${queryParams}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Get compliance score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#388e3c';
    if (score >= 70) return '#fbc02d';
    if (score >= 50) return '#f57c00';
    return '#d32f2f';
  };

  // Get compliance score label
  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  // Chart data for events by category
  const categoryChartData = report?.details?.eventsByCategory ? {
    labels: Object.keys(report.details.eventsByCategory),
    datasets: [{
      label: 'Events',
      data: Object.values(report.details.eventsByCategory),
      backgroundColor: [
        '#1976d2',
        '#388e3c',
        '#fbc02d',
        '#f57c00',
        '#d32f2f',
        '#7b1fa2',
      ],
    }],
  } : null;

  // Chart data for events by severity
  const severityChartData = report?.details?.eventsBySeverity ? {
    labels: Object.keys(report.details.eventsBySeverity),
    datasets: [{
      label: 'Events',
      data: Object.values(report.details.eventsBySeverity),
      backgroundColor: [
        '#d32f2f', // critical
        '#f57c00', // high
        '#fbc02d', // medium
        '#388e3c', // low
        '#1976d2', // info
      ],
    }],
  } : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Card>
          <CardHeader
            title="Compliance Dashboard"
            subheader="Monitor compliance across multiple frameworks"
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={fetchReport}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => exportReport(ReportFormat.PDF)}
                  disabled={loading || !report}
                >
                  Export
                </Button>
              </Box>
            }
          />

          <CardContent>
            <Grid container spacing={2} alignItems="center">
              {/* Report type selector */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    label="Report Type"
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                  >
                    <MenuItem value={ReportType.SUMMARY}>Summary</MenuItem>
                    <MenuItem value={ReportType.SOC2_USER_ACTIVITY}>SOC 2: User Activity</MenuItem>
                    <MenuItem value={ReportType.SOC2_SECURITY_INCIDENTS}>SOC 2: Security Incidents</MenuItem>
                    <MenuItem value={ReportType.SOC2_ACCESS_REVIEW}>SOC 2: Access Review</MenuItem>
                    <MenuItem value={ReportType.GDPR_DATA_ACCESS}>GDPR: Data Access</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Period start */}
              <Grid item xs={6} md={2}>
                <DatePicker
                  label="Start Date"
                  value={periodStart}
                  onChange={(date) => date && setPeriodStart(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </Grid>

              {/* Period end */}
              <Grid item xs={6} md={2}>
                <DatePicker
                  label="End Date"
                  value={periodEnd}
                  onChange={(date) => date && setPeriodEnd(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading indicator */}
        {loading && !report && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Metrics */}
        {metrics && (
          <Grid container spacing={2}>
            {/* Compliance score */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Compliance Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                    <Typography variant="h3" sx={{ color: getScoreColor(metrics.complianceScore) }}>
                      {metrics.complianceScore}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getScoreLabel(metrics.complianceScore)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.complianceScore}
                    sx={{
                      mt: 2,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getScoreColor(metrics.complianceScore),
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Total events */}
            <Grid item xs={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Events
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {metrics.totalEvents.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Critical events */}
            <Grid item xs={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Critical Events
                  </Typography>
                  <Typography variant="h4" color="error" sx={{ mt: 1 }}>
                    {metrics.criticalEvents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* High severity events */}
            <Grid item xs={6} md={2}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    High Severity
                  </Typography>
                  <Typography variant="h4" color="warning" sx={{ mt: 1 }}>
                    {metrics.highSeverityEvents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Violations */}
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Violations
                  </Typography>
                  <Typography variant="h4" color={metrics.violations > 0 ? 'error' : 'success'} sx={{ mt: 1 }}>
                    {metrics.violations}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Charts */}
        <Grid container spacing={2}>
          {/* Events by category */}
          {categoryChartData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Events by Category" />
                <CardContent>
                  <Bar data={categoryChartData} options={{ responsive: true }} />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Events by severity */}
          {severityChartData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Events by Severity" />
                <CardContent>
                  <Doughnut data={severityChartData} options={{ responsive: true }} />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Recommendations */}
        {metrics?.recommendations && metrics.recommendations.length > 0 && (
          <Card>
            <CardHeader title="Recommendations" />
            <CardContent>
              <Stack spacing={1}>
                {metrics.recommendations.map((recommendation, index) => (
                  <Alert key={index} severity="warning" icon={<WarningIcon />}>
                    {recommendation}
                  </Alert>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* User activities table (for SOC 2 reports) */}
        {report?.details?.userActivities && (
          <Card>
            <CardHeader title="User Activities" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Logins</TableCell>
                      <TableCell align="right">Failed</TableCell>
                      <TableCell align="right">Resources Accessed</TableCell>
                      <TableCell align="right">Risk Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.details.userActivities.slice(0, 10).map((user: any) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <Typography variant="body2">{user.username}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{user.loginCount}</TableCell>
                        <TableCell align="right">{user.failedLogins}</TableCell>
                        <TableCell align="right">{user.resourcesAccessed}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={user.riskScore}
                            size="small"
                            color={user.riskScore > 50 ? 'error' : user.riskScore > 20 ? 'warning' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Security incidents table */}
        {report?.details?.incidents && (
          <Card>
            <CardHeader title="Security Incidents" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.details.incidents.map((incident: any) => (
                      <TableRow key={incident.id}>
                        <TableCell>
                          {new Date(incident.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <Chip
                            label={incident.severity}
                            size="small"
                            color={
                              incident.severity === 'critical'
                                ? 'error'
                                : incident.severity === 'high'
                                ? 'warning'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{incident.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={incident.status}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ComplianceDashboard;
