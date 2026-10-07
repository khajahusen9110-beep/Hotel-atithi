import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// A new page should open at its top, not at the previous page's scroll position.
// Keyed on the path only, so menu filters (?category=, ?q=) keep their own scrolling.
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};
