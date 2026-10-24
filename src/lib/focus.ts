import { useEffect } from 'react';
import { Platform } from 'react-native';
// Move an inline editor into view without changing the document's scrolling model.
export function useEditorFocus(anchor: string, activeKey: string | undefined) {
  useEffect(() => {
    if (activeKey && Platform.OS === 'web') {
      const target = document.getElementById(anchor);
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
      target
        ?.querySelector('input,textarea,button')
        ?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [anchor, activeKey]);
}
