import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import ROUTES from '../../app/router/routePaths';
import { useAuth } from '../../shared/hooks/useAuth';
import { useLanguage } from '../../shared/hooks/useLanguage';
import { getOnboardingSteps } from './onboardingSteps';

export const GuidedOnboardingContext = createContext(null);

function getStorageKey(role) {
  return `ims_onboarding_completed_${String(role || 'user').toLowerCase()}`;
}

function waitForElement(selector, timeout = 1800) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const tick = () => {
      const element = document.querySelector(selector);

      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  });
}

function clearHighlightedElements() {
  document.querySelectorAll('.ims-onboarding-target-active').forEach((item) => {
    item.classList.remove('ims-onboarding-target-active');
  });
}

function highlightElement(element) {
  clearHighlightedElements();

  if (element) {
    element.classList.add('ims-onboarding-target-active');
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }
}

function calculatePopoverPosition(targetBox) {
  if (!targetBox) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const popoverWidth = Math.min(440, window.innerWidth - 32);
  const estimatedHeight = 280;
  const spacing = 18;

  const targetTop = targetBox.top - window.scrollY;
  const targetLeft = targetBox.left - window.scrollX;

  let top = targetTop + targetBox.height + spacing;
  let left = targetLeft;

  if (top + estimatedHeight > window.innerHeight - 20) {
    top = Math.max(20, targetTop - estimatedHeight - spacing);
  }

  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }

  if (left < 16) {
    left = 16;
  }

  return {
    top,
    left,
    transform: 'none',
  };
}

function GuidedOnboardingProvider({ children }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const role = user?.role || '';
  const steps = useMemo(() => getOnboardingSteps(role, ROUTES), [role]);

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState(null);
  const [targetMissing, setTargetMissing] = useState(false);

  const currentStep = steps[stepIndex];

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(getStorageKey(role), 'true');
    } catch {
      // Ignore storage errors
    }

    clearHighlightedElements();
    setIsOpen(false);
    setStepIndex(0);
    setTargetBox(null);
    setTargetMissing(false);
  }, [role]);

  const startOnboarding = useCallback(() => {
    if (!steps.length) return;

    setStepIndex(0);
    setIsOpen(true);
  }, [steps.length]);

  const restartOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(role));
    } catch {
      // Ignore storage errors
    }

    startOnboarding();
  }, [role, startOnboarding]);

  useEffect(() => {
    if (!role || !steps.length) return undefined;

    try {
      const completed = localStorage.getItem(getStorageKey(role)) === 'true';

      if (!completed) {
        const timer = window.setTimeout(() => {
          setIsOpen(true);
          setStepIndex(0);
        }, 700);

        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }

    return undefined;
  }, [role, steps.length]);

  useEffect(() => {
    if (!isOpen || !currentStep) return undefined;

    let cancelled = false;

    const runStep = async () => {
      setTargetMissing(false);
      setTargetBox(null);
      clearHighlightedElements();

      if (currentStep.route) {
        navigate(currentStep.route);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 520));

      const element = await waitForElement(currentStep.target);

      if (cancelled) return;

      if (!element) {
        setTargetMissing(true);
        setTargetBox(null);
        return;
      }

      highlightElement(element);

      const rect = element.getBoundingClientRect();

      setTargetBox({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    runStep();

    return () => {
      cancelled = true;
    };
  }, [currentStep, isOpen, navigate]);

  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      completeOnboarding();
      return;
    }

    setStepIndex((current) => current + 1);
  };

  const goPrevious = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goToStep = (index) => {
    setStepIndex(index);
  };

  const value = useMemo(
    () => ({
      startOnboarding,
      restartOnboarding,
      completeOnboarding,
      isOnboardingOpen: isOpen,
    }),
    [startOnboarding, restartOnboarding, completeOnboarding, isOpen]
  );

  const title = isArabic ? currentStep?.titleAr : currentStep?.titleEn;
  const body = isArabic ? currentStep?.bodyAr : currentStep?.bodyEn;
  const popoverStyle = calculatePopoverPosition(targetBox);

  return (
    <GuidedOnboardingContext.Provider value={value}>
      {children}

      {isOpen && currentStep
        ? createPortal(
            <>
              <style>{`
                .ims-onboarding-backdrop {
                  position: fixed;
                  inset: 0;
                  z-index: 9000;
                  background: rgba(7, 31, 53, 0.18);
                  pointer-events: auto;
                }

                .ims-onboarding-target-active {
                  position: relative !important;
                  z-index: 9010 !important;
                  border-radius: 18px !important;
                  outline: 4px solid rgba(20, 200, 195, 0.82) !important;
                  outline-offset: 4px !important;
                  box-shadow:
                    0 0 0 9999px rgba(7, 31, 53, 0.12),
                    0 0 0 10px rgba(20, 200, 195, 0.16),
                    0 22px 55px rgba(7, 31, 53, 0.24) !important;
                }

                .ims-onboarding-popover {
                  position: fixed;
                  z-index: 9020;
                  width: min(440px, calc(100vw - 2rem));
                  overflow: hidden;
                  border-radius: 28px;
                  background: #ffffff;
                  color: #10243f;
                  border: 1px solid rgba(214, 228, 238, 0.98);
                  box-shadow: 0 32px 90px rgba(7, 31, 53, 0.26);
                }

                .ims-onboarding-popover::before {
                  content: "";
                  position: absolute;
                  inset-inline: 0;
                  top: 0;
                  height: 6px;
                  background: linear-gradient(90deg, #0796a6, #14c8c3, #2ee6d3);
                }

                .ims-onboarding-header {
                  display: flex;
                  align-items: flex-start;
                  justify-content: space-between;
                  gap: 0.8rem;
                  padding: 1.1rem 1.15rem 0.75rem;
                  background:
                    radial-gradient(circle at 15% 10%, rgba(20, 200, 195, 0.12), transparent 32%),
                    linear-gradient(180deg, #ffffff, #f8fdff);
                  border-bottom: 1px solid #edf3f8;
                }

                .ims-onboarding-step-label {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.4rem;
                  min-height: 30px;
                  padding: 0.25rem 0.7rem;
                  border-radius: 999px;
                  color: #0796a6;
                  background: #e2fafa;
                  font-size: 0.78rem;
                  font-weight: 900;
                  border: 1px solid rgba(20, 200, 195, 0.22);
                }

                .ims-onboarding-close-btn {
                  min-width: 92px;
                  min-height: 36px;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  border: 1px solid rgba(255, 90, 107, 0.22);
                  border-radius: 14px;
                  color: #c02c3f;
                  background: #ffedf0;
                  font-size: 0.82rem;
                  font-weight: 900;
                }

                .ims-onboarding-close-btn:hover {
                  color: #ffffff;
                  background: #e43f52;
                  border-color: #e43f52;
                }

                .ims-onboarding-body {
                  padding: 1rem 1.15rem 1.15rem;
                }

                .ims-onboarding-popover h3 {
                  margin: 0 0 0.55rem;
                  font-size: 1.18rem;
                  font-weight: 900;
                  color: #10243f;
                  line-height: 1.5;
                }

                .ims-onboarding-popover p {
                  margin: 0;
                  color: #637894;
                  line-height: 1.85;
                  font-size: 0.94rem;
                  font-weight: 720;
                }

                .ims-onboarding-step-dots {
                  display: flex;
                  align-items: center;
                  gap: 0.35rem;
                  margin: 0 0 0.9rem;
                  overflow-x: auto;
                  padding-bottom: 0.2rem;
                }

                .ims-onboarding-step-dot {
                  width: 28px;
                  height: 7px;
                  flex: 0 0 auto;
                  border: none;
                  border-radius: 999px;
                  background: #dce8f2;
                  padding: 0;
                }

                .ims-onboarding-step-dot.active {
                  width: 42px;
                  background: linear-gradient(90deg, #0796a6, #14c8c3);
                  box-shadow: 0 6px 14px rgba(7, 150, 166, 0.18);
                }

                .ims-onboarding-step-dot.done {
                  background: rgba(20, 200, 195, 0.42);
                }

                .ims-onboarding-missing {
                  margin-top: 0.9rem;
                  padding: 0.8rem 0.9rem;
                  border-radius: 18px;
                  background: #fff4dc;
                  color: #9a630e;
                  border: 1px solid rgba(244, 166, 42, 0.24);
                  font-size: 0.84rem;
                  font-weight: 850;
                  line-height: 1.7;
                }

                .ims-onboarding-actions {
                  display: grid;
                  grid-template-columns: 1fr 1.4fr;
                  gap: 0.65rem;
                  margin-top: 1.1rem;
                }

                .ims-onboarding-actions button {
                  min-height: 46px;
                  border-radius: 16px;
                  border: 1px solid #dfeaf3;
                  background: #ffffff;
                  color: #243b5a;
                  padding: 0 0.85rem;
                  font-size: 0.88rem;
                  font-weight: 900;
                }

                .ims-onboarding-actions button:disabled {
                  opacity: 0.45;
                  cursor: not-allowed;
                }

                .ims-onboarding-actions .primary {
                  color: #ffffff;
                  border-color: transparent;
                  background: linear-gradient(135deg, #0796a6, #14c8c3);
                  box-shadow: 0 14px 30px rgba(7, 150, 166, 0.20);
                }

                .ims-onboarding-actions .primary:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 18px 38px rgba(7, 150, 166, 0.25);
                }

                .ims-onboarding-footer-note {
                  margin-top: 0.8rem;
                  padding: 0.65rem 0.75rem;
                  border-radius: 16px;
                  color: #5e718d;
                  background: #f8fbfe;
                  border: 1px solid #edf3f8;
                  font-size: 0.78rem;
                  font-weight: 800;
                  line-height: 1.6;
                }

                @media (max-width: 575.98px) {
                  .ims-onboarding-popover {
                    inset-inline: 1rem !important;
                    top: auto !important;
                    bottom: 1rem !important;
                    left: 1rem !important;
                    width: auto;
                    transform: none !important;
                  }

                  .ims-onboarding-actions {
                    grid-template-columns: 1fr;
                  }

                  .ims-onboarding-close-btn {
                    min-width: 78px;
                  }
                }
              `}</style>

              <div className="ims-onboarding-backdrop" />

              <div
                className="ims-onboarding-popover"
                dir={isArabic ? 'rtl' : 'ltr'}
                style={popoverStyle}
              >
                <div className="ims-onboarding-header">
                  <div className="ims-onboarding-step-label">
                    {isArabic
                      ? `الخطوة ${stepIndex + 1} من ${steps.length}`
                      : `Step ${stepIndex + 1} of ${steps.length}`}
                  </div>

                  <button
                    type="button"
                    className="ims-onboarding-close-btn"
                    onClick={completeOnboarding}
                  >
                    {isArabic ? 'إنهاء' : 'Finish'}
                  </button>
                </div>

                <div className="ims-onboarding-body">
                  <div className="ims-onboarding-step-dots" aria-hidden="true">
                    {steps.map((step, index) => (
                      <button
                        key={step.key}
                        type="button"
                        className={[
                          'ims-onboarding-step-dot',
                          index === stepIndex ? 'active' : '',
                          index < stepIndex ? 'done' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => goToStep(index)}
                      />
                    ))}
                  </div>

                  <h3>{title}</h3>
                  <p>{body}</p>

                  {targetMissing ? (
                    <div className="ims-onboarding-missing">
                      {isArabic
                        ? 'لم يتم العثور على العنصر في هذه الصفحة. تأكد من إضافة data-onboarding للعنصر المطلوب أو من صحة مسار الصفحة.'
                        : 'Target element was not found. Make sure the correct data-onboarding attribute exists and the route is correct.'}
                    </div>
                  ) : null}

                  <div className="ims-onboarding-actions">
                    <button type="button" onClick={goPrevious} disabled={stepIndex === 0}>
                      {isArabic ? 'السابق' : 'Previous'}
                    </button>

                    <button type="button" className="primary" onClick={goNext}>
                      {stepIndex >= steps.length - 1
                        ? isArabic
                          ? 'إنهاء الدليل'
                          : 'Finish Guide'
                        : isArabic
                          ? 'التالي'
                          : 'Next'}
                    </button>
                  </div>

                  <div className="ims-onboarding-footer-note">
                    {isArabic
                      ? 'يمكنك إعادة تشغيل هذا الدليل لاحقًا من زر علامة الاستفهام في أعلى الصفحة.'
                      : 'You can restart this guide later from the question mark button in the top bar.'}
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </GuidedOnboardingContext.Provider>
  );
}

export default GuidedOnboardingProvider;