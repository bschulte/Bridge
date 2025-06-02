import { ContextBridgeApi } from './ipc.interface'

declare global {
	interface Window {
		electron: ContextBridgeApi
	}
}
