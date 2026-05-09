import { EventEmitter } from 'events';

export type LogType = 'info' | 'warn' | 'error' | 'success' | 'system';

export interface HabitatSignal {
  timestamp: string;
  action: string;
  message: string;
  type: LogType;
  file?: string;
}

/**
 * Log filter configuration.
 * - 'noise': routine operational logs (DB upserts, link syncs, scans) — suppressed by default
 * - 'signal': meaningful events (errors, security, state changes, user actions) — always shown
 *
 * HATCH_DATABASE gated logs are only emitted when the ledger is active.
 */
type LogLevel = 'silent' | 'signal' | 'verbose';

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'signal';

/** Actions that are routine DB/FS noise — suppressed at 'signal' level */
const NOISE_ACTIONS = new Set([
  'ledger',      // pearl upserts, link syncs
  'watch',       // FS change events
  'scan',        // auto-scan ticks
]);

/** Actions that contain sensitive material — never log the payload */
const SENSITIVE_ACTIONS = new Set([
  'auth',        // any auth-related logging
  'key',         // API key operations
  'token',       // token operations
]);

class HabitatLogger extends EventEmitter {
  private static instance: HabitatLogger;
  private isLedgerHatched: boolean;

  private constructor() {
    super();
    this.isLedgerHatched = process.env.HATCH_DATABASE === 'true';
  }

  public static getInstance(): HabitatLogger {
    if (!HabitatLogger.instance) {
      HabitatLogger.instance = new HabitatLogger();
    }
    return HabitatLogger.instance;
  }

  /**
   * Check if a log entry should be emitted based on current level and action type.
   */
  private shouldLog(action: string, type: LogType): boolean {
    if (CURRENT_LOG_LEVEL === 'verbose') return true;
    if (CURRENT_LOG_LEVEL === 'silent') return type === 'error';

    // 'signal' level (default): suppress routine noise, emit signals
    if (NOISE_ACTIONS.has(action)) return false;

    // Always emit errors, warns, security events
    if (type === 'error' || type === 'warn' || type === 'system') return true;

    // Emit success and info for non-noise actions
    return true;
  }

  /**
   * Sanitize a log message to prevent credential leakage.
   * Strips anything that looks like an API key, token, or secret.
   */
  private sanitize(message: string, action: string): string {
    if (SENSITIVE_ACTIONS.has(action)) {
      return '[REDACTED — sensitive action]';
    }

    // Strip potential API keys: sk-...,Bearer ...,key=..., etc.
    return message
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]{20,}/gi, 'Bearer [REDACTED]')
      .replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[REDACTED_CREDENTIAL]')
      .replace(/authorization["']?\s*[:=]\s*["']?\S+/gi, 'authorization: [REDACTED]');
  }

  /**
   * Emit a signal to the reef (and the CLI tab).
   *
   * OWASP: Never log credentials, API keys, or tokens.
   * Noise: Routine ledger/scan/watch logs are suppressed at 'signal' level.
   * Gating: HATCH_DATABASE-gated logs emit a hint when the ledger is dormant.
   */
  public log(action: string, message: string, type: LogType = 'info', file?: string) {
    // Check noise filter
    if (!this.shouldLog(action, type)) return;

    // Sanitize to prevent credential leakage
    const safeMessage = this.sanitize(message, action);

    // HATCH_DATABASE gate: if action requires ledger and it's dormant, emit once
    if (!this.isLedgerHatched && action === 'ledger') {
      // Only emit the dormancy notice, not the routine operation
      return;
    }

    const signal: HabitatSignal = {
      timestamp: new Date().toISOString(),
      action,
      message: safeMessage,
      type,
      file
    };

    // Console output for terminal visibility
    const icon = type === 'error' ? '🔴' : type === 'warn' ? '🟡' : type === 'success' ? '🟢' : type === 'system' ? '⚙️' : '🔵';
    console.log(`[Habitat] ${icon} [${action.toUpperCase()}] ${safeMessage}${file ? ` (${file})` : ''}`);

    this.emit('signal', signal);
  }

  /**
   * Emit a security-relevant log. These ALWAYS pass through regardless of log level.
   * Used for: auth failures, path traversal attempts, CORS rejections, invalid API keys.
   */
  public security(action: string, message: string) {
    const safeMessage = this.sanitize(message, action);

    const signal: HabitatSignal = {
      timestamp: new Date().toISOString(),
      action: `security:${action}`,
      message: safeMessage,
      type: 'warn',
    };

    console.log(`[Habitat] 🛡️  [SECURITY:${action.toUpperCase()}] ${safeMessage}`);
    this.emit('signal', signal);
  }

  /**
   * Emit a critical error that demands operator attention.
   * These ALWAYS pass through regardless of log level.
   */
  public critical(action: string, message: string) {
    const safeMessage = this.sanitize(message, action);

    const signal: HabitatSignal = {
      timestamp: new Date().toISOString(),
      action,
      message: safeMessage,
      type: 'error',
    };

    console.error(`[Habitat] 🔴 [CRITICAL:${action.toUpperCase()}] ${safeMessage}`);
    this.emit('signal', signal);
  }
}

export const habitatLogger = HabitatLogger.getInstance();
