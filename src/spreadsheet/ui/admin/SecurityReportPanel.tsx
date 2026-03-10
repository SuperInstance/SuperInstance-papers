/**
 * POLLN Spreadsheet UI - Security Report Panel
 *
 * React component for security-focused audit reporting.
 * Provides threat detection, incident tracking, and security summaries.
 *
 * Features:
 * - Real-time security alerts
 * - Threat level indicators
 * - Incident response tracking
 * - Security metrics
 * - Anomaly detection
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Gavel as BlockIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { AuditEvent, AuditSeverity } from '../../backend/audit/AuditLogger';
import { SecurityEventType } from '../../backend/audit/EventTypes';

interface SecurityReportPanelProps {
  apiBaseUrl?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  actor?: {
    id: string;
    username?: string;
    ipAddress?: string;
  };
  affectedResources: string[];
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  recommendations: string[];
}

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  threatScore: number;
  openIncidents: number;
  blockedAttempts: number;
  suspiciousActivity: number;
  activeUsers: number;
  timeSinceLastIncident: string;
}

export const SecurityReportPanel: React.FC<SecurityReportPanelProps> = ({
  apiBaseUrl = '/api/security',
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  // State
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch security data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch alerts
      const alertsResponse = await fetch(`${apiBaseUrl}/alerts`);
      if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts || []);

      // Fetch metrics
      const metricsResponse = await fetch(`${apiBaseUrl}/metrics`);
      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get threat level color
  const getThreatLevelColor = (level: string): string => {
    switch (level) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  // Get threat level icon
  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return ErrorIcon;
      case 'high': return WarningIcon;
      case 'medium': return WarningIcon;
      case 'low': return InfoIcon;
      default: return InfoIcon;
    }
  };

  // Get status color
  const getStatusColor = (status: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (status) {
      case 'open': return 'error';
      case 'investigating': return 'warning';
      case 'mitigated': return 'info';
      case 'closed': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Card>
        <CardHeader
          title="Security Report Panel"
          subheader="Real-time security monitoring and threat detection"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Badge color="error" variant="dot" invisible={!metrics || metrics.openIncidents === 0}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={fetchData}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Badge>
            </Box>
          }
        />
      </Card>

      {/* Error display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Security metrics */}
      {metrics && (
        <>
          {/* Threat level banner */}
          <Alert
            severity={
              metrics.threatLevel === 'critical'
                ? 'error'
                : metrics.threatLevel === 'high'
                ? 'warning'
                : metrics.threatLevel === 'medium'
                ? 'info'
                : 'success'
            }
            icon={getThreatLevelIcon(metrics.threatLevel)}
          >
            <AlertTitle>Threat Level: {metrics.threatLevel.toUpperCase()}</AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                Current threat score: {metrics.threatScore}/100
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.threatScore}
                sx={{
                  flexGrow: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getThreatLevelColor(metrics.threatLevel),
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </Typography>
            </Box>
          </Alert>

          {/* Metrics cards */}
          <Grid container spacing={2}>
            {/* Open incidents */}
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Open Incidents
                      </Typography>
                      <Typography variant="h4">
                        {metrics.openIncidents}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Blocked attempts */}
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BlockIcon color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Blocked Attempts
                      </Typography>
                      <Typography variant="h4">
                        {metrics.blockedAttempts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Suspicious activity */}
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <WarningIcon color="info" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Suspicious Activity
                      </Typography>
                      <Typography variant="h4">
                        {metrics.suspiciousActivity}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Active users */}
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SuccessIcon color="success" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Active Users
                      </Typography>
                      <Typography variant="h4">
                        {metrics.activeUsers}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Security alerts */}
      <Card sx={{ flexGrow: 1 }}>
        <CardHeader
          title="Security Alerts"
          subheader={`Showing ${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`}
        />

        <CardContent>
          {alerts.length === 0 ? (
            <Alert severity="success">
              <AlertTitle>All Clear</AlertTitle>
              No security alerts at this time.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => {
                    const Icon = getThreatLevelIcon(alert.severity);
                    return (
                      <TableRow key={alert.id} hover>
                        <TableCell>
                          <Chip
                            icon={<Icon fontSize="small" />}
                            label={alert.severity.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: getThreatLevelColor(alert.severity),
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {alert.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {alert.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {alert.actor?.username || alert.actor?.id || 'Unknown'}
                          </Typography>
                          {alert.actor?.ipAddress && (
                            <Typography variant="caption" color="text.secondary">
                              {alert.actor.ipAddress}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.status}
                            size="small"
                            color={getStatusColor(alert.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Alert details dialog */}
      <Dialog
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Security Alert Details</Typography>
            <IconButton onClick={() => setSelectedAlert(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedAlert && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Severity and status */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  icon={React.createElement(getThreatLevelIcon(selectedAlert.severity))}
                  label={selectedAlert.severity.toUpperCase()}
                  sx={{
                    backgroundColor: getThreatLevelColor(selectedAlert.severity),
                    color: 'white',
                  }}
                />
                <Chip
                  label={selectedAlert.status}
                  color={getStatusColor(selectedAlert.status)}
                  variant="outlined"
                />
              </Box>

              {/* Title and description */}
              <Typography variant="h6">{selectedAlert.title}</Typography>
              <Typography variant="body1">{selectedAlert.description}</Typography>

              <Divider />

              {/* Actor information */}
              {selectedAlert.actor && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Actor Information
                  </Typography>
                  <List dense>
                    {selectedAlert.actor.id && (
                      <ListItem>
                        <ListItemText primary="ID" secondary={selectedAlert.actor.id} />
                      </ListItem>
                    )}
                    {selectedAlert.actor.username && (
                      <ListItem>
                        <ListItemText primary="Username" secondary={selectedAlert.actor.username} />
                      </ListItem>
                    )}
                    {selectedAlert.actor.ipAddress && (
                      <ListItem>
                        <ListItemText primary="IP Address" secondary={selectedAlert.actor.ipAddress} />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              {/* Affected resources */}
              {selectedAlert.affectedResources.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Affected Resources
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedAlert.affectedResources.map((resource, index) => (
                      <Chip key={index} label={resource} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Timeline */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Timeline
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <TimelineIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Detected"
                      secondary={formatDistanceToNow(new Date(selectedAlert.timestamp), { addSuffix: true })}
                    />
                  </ListItem>
                </List>
              </Box>

              {/* Recommendations */}
              {selectedAlert.recommendations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Actions
                  </Typography>
                  <List dense>
                    {selectedAlert.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <InfoIcon color="info" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedAlert(null)}>Close</Button>
          <Button variant="contained" color="primary">
            Take Action
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityReportPanel;
