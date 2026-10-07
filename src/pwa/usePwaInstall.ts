import { useEffect, useState } from 'react';
import { getInstallState, isIosSafari, promptInstall, subscribeInstallState } from './installPrompt';

export function usePwaInstall() {
  const [state, setState] = useState(getInstallState);
  useEffect(() => {
    const update = () => setState(getInstallState());
    update();
    const unsubscribe = subscribeInstallState(update);
    return () => {
      unsubscribe();
    };
  }, []);

  const iosManual = !state.installed && isIosSafari();
  return {
    installed: state.installed,
    /** Android / desktop Chrome & Edge: one-tap install */
    canPrompt: state.canPrompt && !state.installed,
    /** iOS Safari: show "Share → Add to Home Screen" steps */
    iosManual,
    install: promptInstall,
  };
}
