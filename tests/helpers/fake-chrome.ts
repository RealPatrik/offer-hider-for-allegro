type Listener = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void;

export function installFakeChrome(): void {
  const data: Record<string, unknown> = {};
  const listeners: Listener[] = [];
  let messages: Record<string, { message: string }> = {};

  const fakeChrome = {
    storage: {
      local: {
        async get(key: string): Promise<Record<string, unknown>> {
          return key in data ? { [key]: data[key] } : {};
        },
        async set(items: Record<string, unknown>): Promise<void> {
          const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { newValue: value, oldValue: data[key] };
            data[key] = value;
          }
          for (const listener of listeners) listener(changes, "local");
        },
      },
      onChanged: {
        addListener(listener: Listener): void {
          listeners.push(listener);
        },
      },
    },
    i18n: {
      getMessage(key: string): string {
        return messages[key]?.message ?? "";
      },
      setFixtureMessages(next: Record<string, { message: string }>): void {
        messages = next;
      },
    },
    runtime: {
      getURL(path: string): string {
        return `chrome-extension://fake/${path}`;
      },
      getManifest(): { version: string } {
        return { version: "0.0.0-test" };
      },
    },
  };

  (globalThis as Record<string, unknown>).chrome = fakeChrome;
}
