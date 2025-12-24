import React from 'react';
import { Box, Typography, Button } from '@mui/material';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log error to error reporting service (e.g., Sentry) in production
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom color="error">
            حدث خطأ غير متوقع
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleReset}
            sx={{ mr: 2 }}
          >
            إعادة المحاولة
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            تحديث الصفحة
          </Button>
          {import.meta.env.DEV && this.state.error && (
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: 'error.light',
                borderRadius: 1,
                maxWidth: '100%',
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

