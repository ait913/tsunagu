import type { RescueEvent } from "../ws/events.js";

type Subscriber = (event: RescueEvent) => void;

class InMemoryBroker {
  private readonly subscribers = new Map<string, Set<Subscriber>>();

  subscribe(topic: string, subscriber: Subscriber): () => void {
    const set = this.subscribers.get(topic) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.subscribers.set(topic, set);
    return () => {
      const current = this.subscribers.get(topic);
      if (!current) {
        return;
      }
      current.delete(subscriber);
      if (current.size === 0) {
        this.subscribers.delete(topic);
      }
    };
  }

  publish(topic: string, event: RescueEvent): void {
    for (const subscriber of this.subscribers.get(topic) ?? []) {
      subscriber(event);
    }
  }
}

export const realtimeBroker = new InMemoryBroker();
