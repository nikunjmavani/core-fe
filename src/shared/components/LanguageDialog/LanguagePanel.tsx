import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  appearanceChoiceClassName,
  appearanceRowTileClassName,
  appearanceTileActiveClassName,
  appearanceTileIdleClassName,
} from '@/lib/appearance-surface.ts';
import { isMultiLocaleBuild } from '@/lib/i18n/build-runtime.ts';
import { formatDateValue } from '@/lib/i18n/format.ts';
import {
  type CurrencyCode,
  type CurrencyDisplayPreference,
  type DateFormatPreference,
  type FormatLocaleTag,
  type HourCyclePreference,
  LOCALE_FORMAT_SAMPLES,
  type NumberStylePreference,
} from '@/lib/i18n/intl-config.ts';
import {
  CURRENCY_CODE_LIST,
  CURRENCY_DISPLAY_LABEL_KEYS,
  CURRENCY_DISPLAY_PREFERENCE_LIST,
  DATE_FORMAT_LABEL_KEYS,
  DATE_FORMAT_PREFERENCE_LIST,
  DIRECTION_LABEL_KEYS,
  FIRST_DAY_LABEL_KEYS,
  FORMAT_LOCALE_LIST,
  formatLocaleTestId,
  HOUR_CYCLE_LABEL_KEYS,
  HOUR_CYCLE_PREFERENCE_LIST,
  LOCALE_KEYS,
  LOCALE_LABEL_KEYS,
  LOCALE_NS,
  LOCALE_TEST_IDS,
  MEASUREMENT_LABEL_KEYS,
  NUMBER_STYLE_LABEL_KEYS,
  NUMBER_STYLE_PREFERENCE_LIST,
} from '@/lib/i18n/locale.constants.ts';
import { I18N_LOCALES, LOCALE_NATIVE_LABELS } from '@/lib/i18n/locales.ts';
import { cn } from '@/lib/utils.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';
import { Check } from '@/shared/icons/index.ts';
import {
  localeFormatPrefs,
  useLocaleStore,
} from '@/shared/store/useLocaleStore/index.ts';

function FieldLabel({ children }: { children: string }) {
  return <p className="text-sm font-medium">{children}</p>;
}

function OptionPills<T extends string>({
  ariaLabel,
  value,
  options,
  labelFor,
  onPick,
  testPrefix,
}: {
  ariaLabel: string;
  value: T;
  options: readonly T[];
  labelFor: (id: T) => string;
  onPick: (id: T) => void;
  testPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            data-slot="button"
            aria-checked={active}
            onClick={() => onPick(id)}
            data-testid={`${testPrefix}-${id}`}
            className={cn(
              appearanceChoiceClassName,
              'min-w-0 flex-1 text-center text-xs sm:flex-none',
              active
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50',
            )}
          >
            {labelFor(id)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Language + regional formatting controls for the dedicated Language & region
 * dialog. UI language is independent from the regional format locale: the format
 * locale (e.g. United States vs India) drives Intl date/number/currency output, so
 * date ordering localizes automatically (US → MM/DD/YYYY, India → DD/MM/YYYY). A
 * live preview reflects the active choices.
 */
export function LanguagePanel() {
  const { t } = useTranslation(LOCALE_NS);
  const locale = useLocaleStore((s) => s.locale);
  const formatLocale = useLocaleStore((s) => s.formatLocale);
  const dateFormat = useLocaleStore((s) => s.dateFormat);
  const hourCycle = useLocaleStore((s) => s.hourCycle);
  const numberStyle = useLocaleStore((s) => s.numberStyle);
  const currencyDisplay = useLocaleStore((s) => s.currencyDisplay);
  const currencyCode = useLocaleStore((s) => s.currencyCode);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setFormatLocale = useLocaleStore((s) => s.setFormatLocale);
  const setDateFormat = useLocaleStore((s) => s.setDateFormat);
  const setHourCycle = useLocaleStore((s) => s.setHourCycle);
  const setNumberStyle = useLocaleStore((s) => s.setNumberStyle);
  const setCurrencyDisplay = useLocaleStore((s) => s.setCurrencyDisplay);
  const setCurrencyCode = useLocaleStore((s) => s.setCurrencyCode);
  const {
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    direction,
    firstDayOfWeek,
    measurementSystem,
  } = useLocaleFormat();

  const multiLocale = isMultiLocaleBuild();

  const previews = useMemo(() => {
    const prefs = localeFormatPrefs({
      locale,
      formatLocale,
      dateFormat,
      hourCycle,
      numberStyle,
      currencyDisplay,
      currencyCode,
    });
    const sampleTimeOnly = formatDateValue(LOCALE_FORMAT_SAMPLES.dateIso, {
      ...prefs,
      dateFormat: 'time',
    });
    return {
      sampleDateTime: formatDate(LOCALE_FORMAT_SAMPLES.dateIso),
      sampleTimeOnly,
      sampleNumber: formatNumber(LOCALE_FORMAT_SAMPLES.number, {
        maximumFractionDigits: 1,
      }),
      sampleRelative: formatRelativeTime(
        LOCALE_FORMAT_SAMPLES.relativeIso,
        new Date(LOCALE_FORMAT_SAMPLES.dateIso),
      ),
      sampleCurrency: formatCurrency(LOCALE_FORMAT_SAMPLES.currencyCents),
    };
  }, [
    formatDate,
    formatNumber,
    formatRelativeTime,
    formatCurrency,
    locale,
    formatLocale,
    dateFormat,
    hourCycle,
    numberStyle,
    currencyDisplay,
    currencyCode,
  ]);

  return (
    <div className="flex flex-col gap-4" data-testid={LOCALE_TEST_IDS.panel}>
      {multiLocale ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t(LOCALE_KEYS.languageHeading)}</CardTitle>
            <CardDescription>{t(LOCALE_KEYS.languageDescription)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label={t(LOCALE_KEYS.languageHeading)}
            >
              {I18N_LOCALES.map((code) => {
                const active = locale === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    data-slot="button"
                    aria-checked={active}
                    onClick={() => void setLocale(code)}
                    data-testid={LOCALE_TEST_IDS.menuItem(code)}
                    className={cn(
                      appearanceRowTileClassName,
                      active
                        ? appearanceTileActiveClassName
                        : appearanceTileIdleClassName,
                    )}
                  >
                    <span>
                      {/* eslint-disable-next-line security/detect-object-injection -- fixed locale catalog */}
                      {t(LOCALE_LABEL_KEYS[code], {
                        defaultValue: LOCALE_NATIVE_LABELS[code],
                      })}
                    </span>
                    {active ? (
                      <Check className="text-primary size-4 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {multiLocale ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t(LOCALE_KEYS.formatLocaleHeading)}
            </CardTitle>
            <CardDescription>{t(LOCALE_KEYS.formatLocaleDescription)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.formatLocaleHeading)}</FieldLabel>
              <Select
                value={formatLocale}
                onValueChange={(value) => setFormatLocale(value as FormatLocaleTag)}
              >
                <SelectTrigger
                  aria-label={t(LOCALE_KEYS.formatLocaleHeading)}
                  data-testid="format-locale-select"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[90] max-h-64">
                  {FORMAT_LOCALE_LIST.map((entry) => (
                    <SelectItem
                      key={entry.id}
                      value={entry.id}
                      data-testid={formatLocaleTestId(entry.id)}
                    >
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.dateFormatHeading)}</FieldLabel>
              <OptionPills
                ariaLabel={t(LOCALE_KEYS.dateFormatHeading)}
                value={dateFormat}
                options={DATE_FORMAT_PREFERENCE_LIST}
                labelFor={(id) =>
                  // eslint-disable-next-line security/detect-object-injection -- fixed preference catalog
                  t(DATE_FORMAT_LABEL_KEYS[id])
                }
                onPick={(id) => setDateFormat(id as DateFormatPreference)}
                testPrefix="date-format"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.hourCycleHeading)}</FieldLabel>
              <OptionPills
                ariaLabel={t(LOCALE_KEYS.hourCycleHeading)}
                value={hourCycle}
                options={HOUR_CYCLE_PREFERENCE_LIST}
                labelFor={(id) =>
                  // eslint-disable-next-line security/detect-object-injection -- fixed preference catalog
                  t(HOUR_CYCLE_LABEL_KEYS[id])
                }
                onPick={(id) => setHourCycle(id as HourCyclePreference)}
                testPrefix="hour-cycle"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.numberStyleHeading)}</FieldLabel>
              <OptionPills
                ariaLabel={t(LOCALE_KEYS.numberStyleHeading)}
                value={numberStyle}
                options={NUMBER_STYLE_PREFERENCE_LIST}
                labelFor={(id) =>
                  // eslint-disable-next-line security/detect-object-injection -- fixed preference catalog
                  t(NUMBER_STYLE_LABEL_KEYS[id])
                }
                onPick={(id) => setNumberStyle(id as NumberStylePreference)}
                testPrefix="number-style"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.currencyDisplayHeading)}</FieldLabel>
              <OptionPills
                ariaLabel={t(LOCALE_KEYS.currencyDisplayHeading)}
                value={currencyDisplay}
                options={CURRENCY_DISPLAY_PREFERENCE_LIST}
                labelFor={(id) =>
                  // eslint-disable-next-line security/detect-object-injection -- fixed preference catalog
                  t(CURRENCY_DISPLAY_LABEL_KEYS[id])
                }
                onPick={(id) => setCurrencyDisplay(id as CurrencyDisplayPreference)}
                testPrefix="currency-display"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t(LOCALE_KEYS.currencyCodeHeading)}</FieldLabel>
              <Select
                value={currencyCode}
                onValueChange={(value) => setCurrencyCode(value as CurrencyCode)}
              >
                <SelectTrigger
                  aria-label={t(LOCALE_KEYS.currencyCodeHeading)}
                  data-testid="currency-code-select"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[90] max-h-64">
                  {CURRENCY_CODE_LIST.map((entry) => (
                    <SelectItem
                      key={entry.id}
                      value={entry.id}
                      data-testid={`currency-code-${entry.id.toLowerCase()}`}
                    >
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t(LOCALE_KEYS.previewHeading)}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-col gap-1 text-xs">
          <p>{t(LOCALE_KEYS.previewDate, { value: previews.sampleDateTime })}</p>
          <p>{t(LOCALE_KEYS.previewTime, { value: previews.sampleTimeOnly })}</p>
          <p>{t(LOCALE_KEYS.previewNumber, { value: previews.sampleNumber })}</p>
          <p>{t(LOCALE_KEYS.previewRelative, { value: previews.sampleRelative })}</p>
          <p>{t(LOCALE_KEYS.previewCurrency, { value: previews.sampleCurrency })}</p>
          <p data-testid="locale-preview-direction">
            {t(LOCALE_KEYS.previewDirection, {
              // eslint-disable-next-line security/detect-object-injection -- fixed direction catalog
              value: t(DIRECTION_LABEL_KEYS[direction]),
            })}
          </p>
          <p data-testid="locale-preview-first-day">
            {t(LOCALE_KEYS.previewFirstDay, {
              // eslint-disable-next-line security/detect-object-injection -- fixed first-day catalog
              value: t(FIRST_DAY_LABEL_KEYS[firstDayOfWeek]),
            })}
          </p>
          <p data-testid="locale-preview-measurement">
            {t(LOCALE_KEYS.previewMeasurement, {
              // eslint-disable-next-line security/detect-object-injection -- fixed measurement catalog
              value: t(MEASUREMENT_LABEL_KEYS[measurementSystem]),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
