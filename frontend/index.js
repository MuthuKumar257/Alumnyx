import { registerRootComponent } from 'expo';

import App from './App';

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
	const originalWarn = console.warn;
	console.warn = (...args) => {
		const joined = args
			.filter((arg) => typeof arg === 'string')
			.join(' ');

		if (joined.includes('props.pointerEvents is deprecated. Use style.pointerEvents')) {
			return;
		}
		originalWarn(...args);
	};
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
