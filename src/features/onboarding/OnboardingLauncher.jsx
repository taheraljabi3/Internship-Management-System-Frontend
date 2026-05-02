import { useContext } from 'react';
import { GuidedOnboardingContext } from './GuidedOnboardingProvider';
import { useLanguage } from '../../shared/hooks/useLanguage';

function OnboardingLauncher() {
  const onboarding = useContext(GuidedOnboardingContext);
  const { isArabic } = useLanguage();

  if (!onboarding) return null;

  return (
    <button
      type="button"
      className="ims-topbar-icon-btn"
      onClick={onboarding.restartOnboarding}
      title={isArabic ? 'دليل الاستخدام' : 'Guided onboarding'}
    >
      ?
    </button>
  );
}

export default OnboardingLauncher;