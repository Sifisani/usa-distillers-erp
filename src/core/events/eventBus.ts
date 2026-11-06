/**
 * USA Distillers ERP - Core Domain Event Bus
 * 
 * Provides decoupled, asynchronous, strongly-typed in-process communication
 * between ERP modules (Maintenance, Equipment, Stores, Utilities, Production)
 * without premature external message broker overhead.
 */

export type DomainEventType =
  | 'JOB_CARD_CREATED'
  | 'JOB_CARD_STATUS_CHANGED'
  | 'LABOR_LOGGED'
  | 'EQUIPMENT_STATUS_CHANGED'
  | 'EQUIPMENT_MODIFIED'
  | 'SPARES_REQUISITIONED'
  | 'SAFETY_LOTO_PERMIT_SIGNED';

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  sourceModule: 'maintenance' | 'equipment' | 'stores' | 'utilities' | 'production' | 'auth';
  timestamp: string;
  payload: T;
}

export interface JobCardStatusChangedPayload {
  jobCardId: string;
  jobCardNumber: string;
  equipmentId?: string;
  equipmentName: string;
  previousStatus: string;
  newStatus: string;
  actor: string;
}

export interface LaborLoggedPayload {
  jobCardId: string;
  jobCardNumber: string;
  technician: string;
  hours: number;
  taskNotes: string;
}

export interface EquipmentStatusChangedPayload {
  equipmentId: string;
  equipmentCode: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

class DomainEventBus {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();
  private auditHistory: DomainEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a specific domain event
   */
  public subscribe<T = any>(type: DomainEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const handlerSet = this.handlers.get(type)!;
    handlerSet.add(handler as EventHandler);

    // Return unbind function
    return () => {
      handlerSet.delete(handler as EventHandler);
    };
  }

  /**
   * Publish a domain event to all subscribed modules
   */
  public async publish<T = any>(
    type: DomainEventType,
    sourceModule: DomainEvent['sourceModule'],
    payload: T
  ): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      sourceModule,
      timestamp: new Date().toISOString(),
      payload
    };

    // Keep ring buffer of audit logs
    this.auditHistory.unshift(event);
    if (this.auditHistory.length > this.maxHistorySize) {
      this.auditHistory.pop();
    }

    // Notify registered handlers asynchronously
    const handlerSet = this.handlers.get(type);
    if (handlerSet && handlerSet.size > 0) {
      const promises = Array.from(handlerSet).map((handler) => {
        try {
          return Promise.resolve(handler(event));
        } catch (err) {
          console.error(`[EventBus] Error in handler for event ${type}:`, err);
          return Promise.resolve();
        }
      });
      await Promise.all(promises);
    }

    return event;
  }

  /**
   * Retrieve in-memory event audit trail for telemetry and debugging
   */
  public getHistory(): DomainEvent[] {
    return [...this.auditHistory];
  }

  /**
   * Clear event history (testing only)
   */
  public clearHistory(): void {
    this.auditHistory = [];
  }
}

export const eventBus = new DomainEventBus();
