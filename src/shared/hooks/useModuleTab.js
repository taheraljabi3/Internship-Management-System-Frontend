import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

function useModuleTab(defaultTab, allowedTabs = []) {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');

    if (!tab) {
      return defaultTab;
    }

    if (allowedTabs.length > 0 && !allowedTabs.includes(tab)) {
      return defaultTab;
    }

    return tab;
  }, [searchParams, defaultTab, allowedTabs]);

  const setActiveTab = (tab) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('tab', tab);
      return nextParams;
    });
  };

  return {
    activeTab,
    setActiveTab,
  };
}

export default useModuleTab;