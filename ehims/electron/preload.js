const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
    'auth:login',
    'auth:logout',
    'auth:get-current-user',
    'auth:verify-pin',
    'auth:change-password',
    'db:query',
    'inventory:',
    'menu:',
    'order:',
    'pos:',
    'supplier:',
    'eod:',
    'shift:',
    'users:',
    'roles:',
    'settings:',
    'reports:',
    'printer:',
    'receipt:',
    'print:',
    'customer:',
    'suspended-orders:',
    'sync:'
];

function isChannelValid(channel) {
    return validChannels.some(validChannel => {
        if (validChannel.endsWith(':')) {
            return channel.startsWith(validChannel);
        }
        return channel === validChannel;
    });
}

contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => {
        if (isChannelValid(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
        return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    },
    on: (channel, callback) => {
        if (isChannelValid(channel)) {
            const subscription = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        }
    },
    removeListener: (channel, callback) => {
        if (isChannelValid(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    }
});
