export { isSettingsHash, parseSettingsHash, settingsHash } from './settings-hash.ts';
export { isSettingsPathAllowed } from './settings-route-policy.ts';
// The heavy modal is NOT re-exported here on purpose (it would land the whole
// settings tree in every importer's chunk graph). App code mounts the Lazy
// shell; tests import './SettingsModal.tsx' directly.
export { SettingsModalLazy } from './SettingsModalLazy.tsx';
