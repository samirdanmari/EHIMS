import { Injectable } from '@angular/core';

declare global {
  interface Window {
    api: {
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  get isElectron(): boolean {
    return !!(window && window.api);
  }

  async invoke<T>(channel: string, data?: any): Promise<T> {
    if (!this.isElectron) {
      console.warn(`[ElectronService] IPC not available. Cannot invoke channel: ${channel}`);
      return Promise.reject(`Not running in Electron environment`);
    }

    try {
      return await window.api.invoke(channel, data);
    } catch (error) {
      console.error(`[ElectronService] Error invoking ${channel}:`, error);
      throw error;
    }
  }

  on(channel: string, callback: (...args: any[]) => void): void {
    if (!this.isElectron) {
      console.warn(`[ElectronService] IPC not available. Cannot listen on channel: ${channel}`);
      return;
    }
    window.api.on(channel, callback);
  }

  removeListener(channel: string, callback: (...args: any[]) => void): void {
    if (!this.isElectron) {
      console.warn(`[ElectronService] IPC not available. Cannot remove listener on channel: ${channel}`);
      return;
    }
    window.api.removeListener(channel, callback);
  }
}
