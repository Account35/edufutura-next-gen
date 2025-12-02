/**
 * Custom Error Classes for EduFutura Platform
 * Provides typed error handling with user-friendly messages
 */

export class RateLimitError extends Error {
  actionType: string;
  limit: number;
  resetTime: Date;
  
  constructor(actionType: string, limit: number, resetTime: Date, message?: string) {
    super(message || `Rate limit exceeded for ${actionType}`);
    this.name = 'RateLimitError';
    this.actionType = actionType;
    this.limit = limit;
    this.resetTime = resetTime;
  }

  getUserMessage(): string {
    const hoursRemaining = Math.ceil((this.resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
    
    return `You've reached your daily limit of ${this.limit} ${this.actionType} requests. ` +
           `Limit resets in ${hoursRemaining} hours or upgrade to Premium for unlimited access.`;
  }
}

export class ExternalServiceError extends Error {
  serviceName: 'openai' | 'cerebras' | 'elevenlabs' | 'payfast' | 'sendgrid';
  errorCode?: string;
  retryAfter?: number; // seconds
  isRetryable: boolean;
  
  constructor(
    serviceName: ExternalServiceError['serviceName'],
    message: string,
    errorCode?: string,
    retryAfter?: number,
    isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
    this.errorCode = errorCode;
    this.retryAfter = retryAfter;
    this.isRetryable = isRetryable;
  }

  getUserMessage(): string {
    const serviceNames: Record<typeof this.serviceName, string> = {
      openai: 'AI service',
      cerebras: 'AI service',
      elevenlabs: 'Voice service',
      payfast: 'Payment service',
      sendgrid: 'Email service'
    };

    const serviceName = serviceNames[this.serviceName];

    if (this.isRetryable) {
      return `${serviceName} is temporarily unavailable. Please try again${this.retryAfter ? ` in ${this.retryAfter} seconds` : ''}.`;
    }

    return `${serviceName} encountered an error. Please contact support if this persists.`;
  }
}

export class DatabaseError extends Error {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  tableName: string;
  originalError?: Error;
  
  constructor(
    operation: DatabaseError['operation'],
    tableName: string,
    message: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.tableName = tableName;
    this.originalError = originalError;
  }

  getUserMessage(): string {
    return 'A database error occurred. Our team has been notified and is working on a fix.';
  }

  getSentryContext() {
    return {
      operation: this.operation,
      tableName: this.tableName,
      originalError: this.originalError?.message,
      stack: this.originalError?.stack
    };
  }
}

export class ValidationError extends Error {
  field?: string;
  value?: any;
  
  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends Error {
  reason: 'expired' | 'invalid' | 'missing' | 'unauthorized';
  
  constructor(reason: AuthenticationError['reason'], message?: string) {
    super(message || `Authentication failed: ${reason}`);
    this.name = 'AuthenticationError';
    this.reason = reason;
  }

  getUserMessage(): string {
    const messages: Record<typeof this.reason, string> = {
      expired: 'Your session has expired. Please log in again.',
      invalid: 'Invalid credentials. Please check and try again.',
      missing: 'Authentication required. Please log in to continue.',
      unauthorized: 'You do not have permission to perform this action.'
    };
    
    return messages[this.reason];
  }
}
