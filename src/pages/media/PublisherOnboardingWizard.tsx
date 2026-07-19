import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { PublisherOnboardingInput } from "../../services/mediaWorkflowService";
import { useLocale } from "../../lib/i18n";
import {
  createPublisherOnboardingDraft,
  publisherOnboardingSteps,
  toPublisherOnboardingInput,
  validatePublisherOnboarding,
  validatePublisherOnboardingStep,
  type PublisherOnboardingDraft,
  type PublisherOnboardingErrors,
  type PublisherOnboardingField,
  type PublisherOnboardingStep
} from "./publisherOnboardingModel";

type PublisherOnboardingWizardProps = {
  open: boolean;
  mode?: "create" | "edit";
  initialDraft?: PublisherOnboardingDraft;
  onClose: () => void;
  onSubmit: (input: PublisherOnboardingInput) => { allowed: boolean; message?: string };
};

type LocalizedOption = {
  value: string;
  en: string;
  zh: string;
};

const regionOptions: LocalizedOption[] = [
  { value: "CN", en: "Mainland China", zh: "中国大陆" },
  { value: "APAC", en: "APAC", zh: "亚太" },
  { value: "Global", en: "Global", zh: "全球" }
];

const mediaTypeOptions: LocalizedOption[] = [
  { value: "App", en: "Mobile app", zh: "移动应用" },
  { value: "Web", en: "Website", zh: "网站" },
  { value: "Mini Program", en: "Mini program", zh: "小程序" },
  { value: "CTV / OTT", en: "CTV / OTT", zh: "CTV / OTT" },
  { value: "Audio / Podcast", en: "Audio / podcast", zh: "音频 / 播客" }
];

const identifierOptions: LocalizedOption[] = [
  { value: "android_package", en: "Android package name", zh: "Android 包名" },
  { value: "ios_bundle", en: "iOS bundle ID", zh: "iOS Bundle ID" },
  { value: "web_domain", en: "Website domain", zh: "网站域名" },
  { value: "mini_program_app_id", en: "Mini program AppID", zh: "小程序 AppID" },
  { value: "ctv_app_id", en: "CTV app ID", zh: "CTV 应用标识" },
  { value: "other", en: "Other identifier", zh: "其他标识" }
];

const integrationOptions: LocalizedOption[] = [
  { value: "SDK", en: "SDK", zh: "SDK" },
  { value: "API", en: "API", zh: "API" },
  { value: "VAST", en: "VAST", zh: "VAST" },
  { value: "OpenRTB", en: "OpenRTB", zh: "OpenRTB" },
  { value: "S2S", en: "Server-to-server", zh: "Server-to-Server" }
];

const trafficSourceOptions: LocalizedOption[] = [
  { value: "first_party_analytics", en: "First-party analytics", zh: "媒体一方数据" },
  { value: "mmp_report", en: "MMP report", zh: "MMP 报告" },
  { value: "third_party_measurement", en: "Third-party measurement", zh: "第三方监测" },
  { value: "publisher_estimate", en: "Publisher estimate", zh: "媒体预估" }
];

const adFormatOptions: LocalizedOption[] = [
  { value: "Native", en: "Native", zh: "原生广告" },
  { value: "Display", en: "Display", zh: "展示广告" },
  { value: "Interstitial", en: "Interstitial", zh: "插屏广告" },
  { value: "Rewarded Video", en: "Rewarded video", zh: "激励视频" },
  { value: "In-stream Video", en: "In-stream video", zh: "贴片视频" },
  { value: "Audio", en: "Audio", zh: "音频广告" },
  { value: "CTV", en: "CTV", zh: "CTV 广告" }
];

const placementOptions: LocalizedOption[] = [
  { value: "Feed", en: "Feed", zh: "信息流" },
  { value: "App Open", en: "App open", zh: "开屏" },
  { value: "Pre-roll", en: "Pre-roll", zh: "前贴片" },
  { value: "Mid-roll", en: "Mid-roll", zh: "中贴片" },
  { value: "Rewarded", en: "Rewarded", zh: "激励场景" },
  { value: "Content", en: "Content", zh: "内容页" },
  { value: "Fullscreen", en: "Fullscreen", zh: "全屏" }
];

const billingOptions: LocalizedOption[] = [
  { value: "CPM", en: "CPM", zh: "CPM" },
  { value: "CPC", en: "CPC", zh: "CPC" },
  { value: "CPA", en: "CPA", zh: "CPA" },
  { value: "Revenue Share", en: "Revenue share", zh: "收入分成" }
];

const settlementOptions: LocalizedOption[] = [
  { value: "Monthly", en: "Monthly", zh: "按月" },
  { value: "Biweekly", en: "Biweekly", zh: "双周" },
  { value: "Weekly", en: "Weekly", zh: "按周" }
];

const paymentOptions: LocalizedOption[] = [
  { value: "Net 30", en: "Net 30", zh: "月结 30 天" },
  { value: "Net 45", en: "Net 45", zh: "月结 45 天" },
  { value: "Net 60", en: "Net 60", zh: "月结 60 天" }
];

export function PublisherOnboardingWizard({
  open,
  mode = "create",
  initialDraft,
  onClose,
  onSubmit
}: PublisherOnboardingWizardProps) {
  const { locale, t } = useLocale();
  const [draft, setDraft] = useState<PublisherOnboardingDraft>(() => createPublisherOnboardingDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<PublisherOnboardingErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const currentStep = publisherOnboardingSteps[stepIndex];
  const editMode = mode === "edit";
  const stepLabels: Record<PublisherOnboardingStep, string> = {
    identity: t("media.onboardingIdentity"),
    traffic: t("media.onboardingTraffic"),
    inventory: t("media.onboardingInventory"),
    commercial: t("media.onboardingCommercial")
  };

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft ? { ...initialDraft } : createPublisherOnboardingDraft());
    setStepIndex(0);
    setErrors({});
    setSubmitError(undefined);
  }, [initialDraft, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  function setField(field: PublisherOnboardingField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSubmitError(undefined);
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function continueWizard() {
    const stepErrors = validatePublisherOnboardingStep(draft, currentStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setStepIndex((current) => Math.min(publisherOnboardingSteps.length - 1, current + 1));
  }

  function submitWizard() {
    const allErrors = validatePublisherOnboarding(draft);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      const firstInvalidStep = publisherOnboardingSteps.findIndex(
        (step) => Object.keys(validatePublisherOnboardingStep(draft, step)).length > 0
      );
      setStepIndex(Math.max(0, firstInvalidStep));
      return;
    }

    const result = onSubmit(toPublisherOnboardingInput(draft));
    if (result.allowed) {
      onClose();
      return;
    }
    setSubmitError(result.message ?? t("media.onboardingSubmitError"));
  }

  function errorText(field: PublisherOnboardingField) {
    const error = errors[field];
    if (error === "positive") return t("media.onboardingErrorPositive");
    if (error === "email") return t("media.onboardingErrorEmail");
    if (error === "percentage") return t("media.onboardingErrorPercentage");
    return error ? t("media.onboardingErrorRequired") : undefined;
  }

  const localizedOptions = (options: LocalizedOption[]) =>
    options.map((option) => ({ value: option.value, label: locale === "zh-CN" ? option.zh : option.en }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5">
      <section
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publisher-onboarding-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="publisher-onboarding-title" className="text-xl font-semibold text-slate-950">
              {editMode ? t("media.onboardingEditTitle") : t("media.onboardingTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {editMode ? t("media.onboardingEditDescription") : t("media.onboardingDescription")}
            </p>
          </div>
          <button
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            type="button"
            title={t("media.onboardingClose")}
            aria-label={t("media.onboardingClose")}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <nav className="grid grid-cols-4 border-b border-slate-200 bg-slate-50" aria-label={t("media.onboardingProgress")}>
          {publisherOnboardingSteps.map((step, index) => (
            <button
              key={step}
              className={`min-w-0 border-b-2 px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
                index === stepIndex
                  ? "border-blue-600 bg-white text-blue-700"
                  : index < stepIndex
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-slate-400"
              }`}
              type="button"
              disabled={index > stepIndex}
              aria-current={index === stepIndex ? "step" : undefined}
              onClick={() => index < stepIndex && setStepIndex(index)}
            >
              <span className="hidden sm:inline">{String(index + 1).padStart(2, "0")} </span>
              {stepLabels[step]}
            </button>
          ))}
        </nav>

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (stepIndex === publisherOnboardingSteps.length - 1) submitWizard();
            else continueWizard();
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {currentStep === "identity" ? (
              <FormGrid>
                <TextField id="publisher-name" label={t("media.onboardingPublisherName")} value={draft.name} error={errorText("name")} required autoFocus onChange={(value) => setField("name", value)} />
                <TextField id="publisher-legal" label={t("media.onboardingLegalEntity")} value={draft.legalEntity} error={errorText("legalEntity")} required onChange={(value) => setField("legalEntity", value)} />
                <SelectField id="publisher-region" label={t("media.onboardingRegion")} value={draft.region} options={localizedOptions(regionOptions)} onChange={(value) => setField("region", value)} />
                <SelectField id="publisher-media-type" label={t("media.onboardingMediaType")} value={draft.mediaType} options={localizedOptions(mediaTypeOptions)} onChange={(value) => setField("mediaType", value)} />
                <TextField id="publisher-property" label={t("media.onboardingPropertyName")} value={draft.propertyName} error={errorText("propertyName")} required onChange={(value) => setField("propertyName", value)} />
                <SelectField id="publisher-identifier-type" label={t("media.onboardingIdentifierType")} value={draft.propertyIdentifierType} options={localizedOptions(identifierOptions)} onChange={(value) => setField("propertyIdentifierType", value)} />
                <TextField id="publisher-identifier" label={t("media.onboardingIdentifier")} value={draft.propertyIdentifier} error={errorText("propertyIdentifier")} required placeholder="com.example.app" onChange={(value) => setField("propertyIdentifier", value)} />
                <SelectField id="publisher-integration" label={t("media.onboardingIntegrationType")} value={draft.integrationType} options={localizedOptions(integrationOptions)} onChange={(value) => setField("integrationType", value)} />
              </FormGrid>
            ) : null}

            {currentStep === "traffic" ? (
              <FormGrid>
                <TextField id="publisher-dau" type="number" min="1" label={t("media.onboardingDau")} value={draft.dailyActiveUsers} error={errorText("dailyActiveUsers")} required onChange={(value) => setField("dailyActiveUsers", value)} />
                <TextField id="publisher-mau" type="number" min="1" label={t("media.onboardingMau")} value={draft.monthlyActiveUsers} error={errorText("monthlyActiveUsers")} onChange={(value) => setField("monthlyActiveUsers", value)} />
                <TextField id="publisher-requests" type="number" min="1" label={t("media.onboardingDailyRequests")} value={draft.dailyRequests} error={errorText("dailyRequests")} required onChange={(value) => setField("dailyRequests", value)} />
                <TextField id="publisher-data-date" type="date" label={t("media.onboardingDataAsOf")} value={draft.trafficDataAsOf} error={errorText("trafficDataAsOf")} required onChange={(value) => setField("trafficDataAsOf", value)} />
                <SelectField id="publisher-traffic-source" label={t("media.onboardingTrafficSource")} value={draft.trafficSource} options={localizedOptions(trafficSourceOptions)} onChange={(value) => setField("trafficSource", value)} />
              </FormGrid>
            ) : null}

            {currentStep === "inventory" ? (
              <FormGrid>
                <TextField id="publisher-slot-name" label={t("media.onboardingSlotName")} value={draft.slotName} error={errorText("slotName")} required onChange={(value) => setField("slotName", value)} />
                <SelectField id="publisher-ad-format" label={t("media.onboardingAdFormat")} value={draft.adFormat} options={localizedOptions(adFormatOptions)} onChange={(value) => setField("adFormat", value)} />
                <SelectField id="publisher-placement" label={t("media.onboardingPlacement")} value={draft.placementType} options={localizedOptions(placementOptions)} onChange={(value) => setField("placementType", value)} />
                <TextField id="publisher-creative-spec" label={t("media.onboardingCreativeSpec")} value={draft.creativeSpec} placeholder="1080x1920 / 15s" onChange={(value) => setField("creativeSpec", value)} />
                <TextField id="publisher-slot-requests" type="number" min="1" label={t("media.onboardingSlotRequests")} value={draft.slotDailyRequests} error={errorText("slotDailyRequests")} required onChange={(value) => setField("slotDailyRequests", value)} />
                <TextField id="publisher-floor" type="number" min="0" step="0.01" label={t("media.onboardingFloorPrice")} value={draft.floorPrice} error={errorText("floorPrice")} onChange={(value) => setField("floorPrice", value)} />
                <SelectField id="publisher-currency" label={t("media.onboardingCurrency")} value={draft.currency} options={[{ value: "CNY", label: "CNY" }, { value: "USD", label: "USD" }]} onChange={(value) => setField("currency", value)} />
              </FormGrid>
            ) : null}

            {currentStep === "commercial" ? (
              <div className="space-y-6">
                <FieldSection title={t("media.onboardingContactSection")}>
                  <FormGrid>
                    <TextField id="publisher-contact-name" label={t("media.onboardingContactName")} value={draft.contactName} error={errorText("contactName")} required onChange={(value) => setField("contactName", value)} />
                    <TextField id="publisher-contact-role" label={t("media.onboardingContactRole")} value={draft.contactRoleTitle} error={errorText("contactRoleTitle")} required onChange={(value) => setField("contactRoleTitle", value)} />
                    <TextField id="publisher-contact-email" type="email" label={t("media.onboardingContactEmail")} value={draft.contactEmail} error={errorText("contactEmail")} onChange={(value) => setField("contactEmail", value)} />
                    <TextField id="publisher-contact-phone" type="tel" label={t("media.onboardingContactPhone")} value={draft.contactPhone} onChange={(value) => setField("contactPhone", value)} />
                  </FormGrid>
                </FieldSection>
                <FieldSection title={t("media.onboardingTermsSection")}>
                  <FormGrid>
                    <SelectField id="publisher-contract-type" label={t("media.onboardingContractType")} value={draft.contractType} options={[{ value: "Framework", label: locale === "zh-CN" ? "框架协议" : "Framework" }, { value: "Insertion Order", label: locale === "zh-CN" ? "投放订单" : "Insertion order" }]} onChange={(value) => setField("contractType", value)} />
                    <SelectField id="publisher-billing" label={t("media.onboardingBillingModel")} value={draft.billingModel} options={localizedOptions(billingOptions)} error={errorText("billingModel")} onChange={(value) => setField("billingModel", value)} />
                    <SelectField id="publisher-settlement" label={t("media.onboardingSettlementCycle")} value={draft.settlementCycle} options={localizedOptions(settlementOptions)} error={errorText("settlementCycle")} onChange={(value) => setField("settlementCycle", value)} />
                    <SelectField id="publisher-payment" label={t("media.onboardingPaymentTerms")} value={draft.paymentTerms} options={localizedOptions(paymentOptions)} error={errorText("paymentTerms")} onChange={(value) => setField("paymentTerms", value)} />
                    <TextField id="publisher-revenue-share" type="number" min="0" max="100" step="0.01" label={t("media.onboardingRevenueShare")} value={draft.revenueSharePercent} error={errorText("revenueSharePercent")} onChange={(value) => setField("revenueSharePercent", value)} />
                  </FormGrid>
                </FieldSection>
              </div>
            ) : null}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              type="button"
              disabled={stepIndex === 0}
              onClick={() => {
                setErrors({});
                setStepIndex((current) => Math.max(0, current - 1));
              }}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("media.onboardingBack")}
            </button>
            <div className="min-w-0 flex-1 text-center">
              {submitError ? (
                <p className="text-sm font-medium text-rose-700" role="alert">{submitError}</p>
              ) : (
                <p className="hidden text-xs text-slate-500 sm:block">{t("media.onboardingStepCount", { current: stepIndex + 1, total: publisherOnboardingSteps.length })}</p>
              )}
            </div>
            <button className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700" type="submit">
              {stepIndex === publisherOnboardingSteps.length - 1 ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  {editMode ? t("media.onboardingSave") : t("media.onboardingCreate")}
                </>
              ) : (
                <>
                  {t("media.onboardingNext")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function FieldSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function FieldShell({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}{required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}

function TextField({ id, label, value, onChange, error, required, autoFocus, ...inputProps }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  autoFocus?: boolean;
  type?: "text" | "number" | "date" | "email" | "tel";
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <FieldShell id={id} label={label} required={required} error={error}>
      <input
        {...inputProps}
        id={id}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${error ? "border-rose-300" : "border-slate-200"}`}
        value={value}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

function SelectField({ id, label, value, options, onChange, error }: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${error ? "border-rose-300" : "border-slate-200"}`}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </FieldShell>
  );
}
