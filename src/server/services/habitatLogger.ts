import { EventEmitter } from 'events';

export type LogType = 'info' | 'warn' | 'error' | 'success' | 'system';

export interface HabitatSignal {
  timestamp: string;
  action: string;
  message: string;
  type: LogType;
  file?: string;
}

class HabitatLogger extends EventEmitter {
  private static instance: HabitatLogger;

  private constructor() {
    super();
  }

  public static getInstance(): HabitatLogger {
    if (!HabitatLogger.instance) {
      HabitatLogger.instance = new HabitatLogger();
    }
    return HabitatLogger.instance;
  }

  /**
   * Emit a signal to the reef (and the CLI tab)
   */
  public log(action: string, message: string, type: LogType = 'info', file?: string) {
    const signal: HabitatSignal = {
      timestamp: new Date().toISOString(),
      action,
      message,
      type,
      file
    };

    // Console output for terminal visibility
    const icon = type === 'error' ? '🔴' : type === 'warn' ? '🟡' : type === 'success' ? '🟢' : '🔵';
    console.log(`[Habitat] ${icon} [${action.toUpperCase()}] ${message}${file ? ` (${file})` : ''}`);

    this.emit('signal', signal);
  }
}

export const habitatLogger = HabitatLogger.getInstance();
