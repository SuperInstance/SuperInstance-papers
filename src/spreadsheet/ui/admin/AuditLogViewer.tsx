/**
 * POLLN Spreadsheet UI - Audit Log Viewer
 *
 * React component for viewing and filtering audit logs.
 * Provides real-time monitoring and search capabilities.
 *
 * Features:
 * - Real-time log streaming
 * - Advanced filtering
 * - Full-text search
 * - Event details modal
 * - Export functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Pagination,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tooltip,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { AuditEvent, AuditSeverity, AuditOutcome } from '../../backend/audit/AuditLogger';
import { AuditQueryFilters, AuditQueryOptions } from '../../backend/audit/AuditQuery';

/**
 * Severity color mapping
 */
const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c',
  info: '#1976d2',
};

/**
 * Severity icon mapping
 */
const SEVERITY_ICONS: Record<AuditSeverity, React.ElementType> = {
  critical: ErrorIcon,
  high: WarningIcon,
  medium: WarningIcon,
  low: InfoIcon,
  info: InfoIcon,
};

/**
 * Outcome icon mapping
 */
const OUTCOME_ICONS: Record<AuditOutcome, React.ElementType> = {
  success: SuccessIcon,
  failure: ErrorIcon,
  partial: WarningIcon,
  pending: InfoIcon,
};

interface AuditLogViewerProps {
  apiBaseUrl?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  apiBaseUrl = '/api/audit',
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  // State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [isLive, setIsLive] = useState(autoRefresh);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filters
  const [filters, setFilters] = useState<AuditQueryFilters>({});
  const [searchText, setSearchText] = useState('');

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (filters.startTime) queryParams.append('startTime', filters.startTime.toISOString());
      if (filters.endTime) queryParams.append('endTime', filters.endTime.toISOString());
      if (filters.actorIds?.length) queryParams.append('actorIds', filters.actorIds.join(','));
      if (filters.eventTypes?.length) queryParams.append('eventTypes', filters.eventTypes.join(','));
      if (filters.categories?.length) queryParams.append('categories', filters.categories.join(','));
      if (filters.severities?.length) queryParams.append('severities', filters.severities.join(','));
      if (filters.resourceTypes?.length) queryParams.append('resourceTypes', filters.resourceTypes.join(','));
      if (filters.outcomes?.length) queryParams.append('outcomes', filters.outcomes.join(','));

      queryParams.append('limit', rowsPerPage.toString());
      queryParams.append('offset', ((page - 1) * rowsPerPage).toString());
      queryParams.append('orderBy', 'timestamp');
      queryParams.append('orderDirection', 'DESC');

      if (searchText) {
        queryParams.append('search', searchText);
      }

      const response = await fetch(`${apiBaseUrl}/events?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit events');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, filters, searchText, page, rowsPerPage]);

  // Export events
  const exportEvents = async (format: 'json' | 'csv') => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);

      const response = await fetch(`${apiBaseUrl}/export?${queryParams}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export events');
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [isLive, fetchEvents, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Render severity badge
  const renderSeverityBadge = (severity: AuditSeverity) => {
    const Icon = SEVERITY_ICONS[severity];
    return (
      <Chip
        icon={<Icon fontSize="small" />}
        label={severity.toUpperCase()}
        size="small"
        sx={{
          backgroundColor: SEVERITY_COLORS[severity],
          color: 'white',
          fontWeight: 'bold',
        }}
      />
    );
  };

  // Render outcome badge
  const renderOutcomeBadge = (outcome: AuditOutcome) => {
    const Icon = OUTCOME_ICONS[outcome];
    const colors: Record<AuditOutcome, string> = {
      success: '#388e3c',
      failure: '#d32f2f',
      partial: '#f57c00',
      pending: '#1976d2',
    };

    return (
      <Chip
        icon={<Icon fontSize="small" />}
        label={outcome.toUpperCase()}
        size="small"
        sx={{
          backgroundColor: colors[outcome],
          color: 'white',
        }}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="Audit Log Viewer"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <ToggleButtonGroup
                value={isLive}
                exclusive
                onChange={(_, value) => setIsLive(value ?? false)}
                size="small"
              >
                <ToggleButton value={true}>
                  <Badge color="success" variant="dot" invisible={!isLive}>
                    LIVE
                  </Badge>
                </ToggleButton>
              </ToggleButtonGroup>

              <Tooltip title="Refresh">
                <IconButton onClick={fetchEvents} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export as JSON">
                <IconButton onClick={() => exportEvents('json')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export as CSV">
                <IconButton onClick={() => exportEvents('csv')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />

        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search events..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchEvents()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            {/* Event type filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={filters.eventTypes?.[0] || ''}
                  label="Event Type"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({
                      ...filters,
                      eventTypes: value ? [value] : undefined,
                    });
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="login_success">Login Success</MenuItem>
                  <MenuItem value="login_failed">Login Failed</MenuItem>
                  <MenuItem value="cell_updated">Cell Updated</MenuItem>
                  <MenuItem value="cell_deleted">Cell Deleted</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Severity filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filters.severities?.[0] || ''}
                  label="Severity"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({
                      ...filters,
                      severities: value ? [value] : undefined,
                    });
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Outcome filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Outcome</InputLabel>
                <Select
                  value={filters.outcomes?.[0] || ''}
                  label="Outcome"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({
                      ...filters,
                      outcomes: value ? [value] : undefined,
                    });
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failure">Failure</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Apply filters button */}
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={fetchEvents}
                disabled={loading}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Events table */}
      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography>Loading events...</Typography>
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography>No events found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </Typography>
                    </TableCell>
                    <TableCell>{renderSeverityBadge(event.severity)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {event.eventType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event.actor.username || event.actor.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event.resource.type}
                        {event.resource.id && `: ${event.resource.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>{renderOutcomeBadge(event.outcome)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {event.action.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, total)} of {total} events
            {isLive && ` • Last updated ${formatDistanceToNow(lastUpdate, { addSuffix: true })}`}
          </Typography>

          <Pagination
            count={Math.ceil(total / rowsPerPage)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      </Card>

      {/* Event details dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Event Details</Typography>
            <IconButton onClick={() => setSelectedEvent(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedEvent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Basic info */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Event ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEvent.id}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Event Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEvent.eventType}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2">
                    {selectedEvent.category}
                  </Typography>
                </Grid>
              </Grid>

              {/* Actor */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Actor
                </Typography>
                <Paper sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        ID
                      </Typography>
                      <Typography variant="body2">{selectedEvent.actor.id}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Username
                      </Typography>
                      <Typography variant="body2">{selectedEvent.actor.username || 'N/A'}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2">{selectedEvent.actor.email || 'N/A'}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        IP Address
                      </Typography>
                      <Typography variant="body2">{selectedEvent.actor.ipAddress || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>

              {/* Resource */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Resource
                </Typography>
                <Paper sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body2">{selectedEvent.resource.type}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        ID
                      </Typography>
                      <Typography variant="body2">{selectedEvent.resource.id || 'N/A'}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Path
                      </Typography>
                      <Typography variant="body2">{selectedEvent.resource.path || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>

              {/* Changes */}
              {selectedEvent.changes && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Changes
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(selectedEvent.changes, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}

              {/* Context */}
              {selectedEvent.context.metadata && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Additional Context
                  </Typography>
                  <Paper sx={{ p: 2 }}>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(selectedEvent.context.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogViewer;
