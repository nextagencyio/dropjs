type EventHandler = (data: unknown, context?: unknown) => Promise<void> | void;

interface HandlerEntry {
  handler: EventHandler;
  priority: number;
}

class EventBusImpl {
  private listeners = new Map<string, HandlerEntry[]>();

  on(event: string, handler: EventHandler, options?: { priority?: number }): void {
    const priority = options?.priority ?? 50;
    const entries = this.listeners.get(event) ?? [];
    entries.push({ handler, priority });
    // Sort by priority: lower number runs first
    entries.sort((a, b) => a.priority - b.priority);
    this.listeners.set(event, entries);
  }

  off(event: string, handler: EventHandler): void {
    const entries = this.listeners.get(event);
    if (!entries) return;
    const filtered = entries.filter((e) => e.handler !== handler);
    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  async emit(event: string, data: unknown, context?: unknown): Promise<void> {
    const entries = this.listeners.get(event);
    if (!entries) return;

    // Sequential execution in priority order (like Drupal hooks)
    for (const entry of entries) {
      await entry.handler(data, context);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

// Stored on globalThis for webpack module sharing.
const gBus = globalThis as unknown as { __dropjs_event_bus?: EventBusImpl };
if (!gBus.__dropjs_event_bus) {
  gBus.__dropjs_event_bus = new EventBusImpl();
}
export const EventBus = gBus.__dropjs_event_bus;
