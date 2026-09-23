import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AutofillPolicy, EducationDegree, LanguageLevel, Profile } from '../../api/types';
import { nullable, str, type FormValues } from '../../components/SchemaFormDialog';
import { formatDate } from '../../utils/format';
import { POLICIES, POLICY_META, PolicyButton } from './PolicyButton';
import { ProfileListSection } from './ProfileListSection';

/*
 * Profilin liste sekmeleri. Her biri ProfileListSection'a sadece alanlarini ve gosterim bicimini verir.
 * toForm: API kaydi -> form degerleri, toBody: form degerleri -> API istek govdesi.
 */

const DEGREES: EducationDegree[] = ['HighSchool', 'Associate', 'Bachelor', 'Master', 'Doctorate', 'Certificate', 'Other'];
const LEVELS: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];

/** "Oca 2022 – Halen" gibi tarih araligi. */
function useDateRange() {
  const { t, i18n } = useTranslation();
  return (start: string | null, end: string | null, current = false) => {
    const f = (d: string | null) => (d ? formatDate(d, i18n.language) : '?');
    if (!start && !end && !current) return '';
    return `${f(start)} – ${current ? t('profile.present') : f(end)}`;
  };
}

/** Bitis tarihi baslangictan once olamaz (backend de ayni kurali uyguluyor). */
function useRangeValidator(startKey: string, endKey: string) {
  const { t } = useTranslation();
  return (v: FormValues) => {
    const s = v[startKey] as string;
    const e = v[endKey] as string;
    return s && e && e < s ? t('validation.dateRange') : null;
  };
}

// ---------------------------------------------------------------------------

export function ExperienceTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const range = useDateRange();
  const validateRange = useRangeValidator('startDate', 'endDate');

  return (
    <ProfileListSection
      collection="experiences"
      items={profile?.workExperiences ?? []}
      title={t('profile.tabs.experience')}
      addLabel={t('profile.add.experience')}
      emptyText={t('profile.empty.experience')}
      itemName={(x) => `${x.title} – ${x.companyName}`}
      fields={[
        { name: 'title', label: t('profile.fields.title'), type: 'text', required: true, maxLength: 200, half: true },
        { name: 'companyName', label: t('board.fields.companyName'), type: 'text', required: true, maxLength: 200, half: true },
        { name: 'location', label: t('board.fields.location'), type: 'text', maxLength: 200 },
        { name: 'startDate', label: t('profile.fields.startDate'), type: 'date', required: true, half: true },
        { name: 'endDate', label: t('profile.fields.endDate'), type: 'date', half: true, disabled: (v) => Boolean(v.isCurrent) },
        { name: 'isCurrent', label: t('profile.fields.isCurrent'), type: 'checkbox' },
        { name: 'description', label: t('profile.fields.description'), type: 'multiline' },
      ]}
      validate={(v) => {
        if (!v.isCurrent && !v.endDate) return t('validation.endDateOrCurrent');
        return v.isCurrent ? null : validateRange(v);
      }}
      toForm={(x) => ({
        title: str(x?.title),
        companyName: str(x?.companyName),
        location: str(x?.location),
        startDate: str(x?.startDate),
        endDate: str(x?.endDate),
        isCurrent: x?.isCurrent ?? false,
        description: str(x?.description),
      })}
      toBody={(v) => ({
        title: (v.title as string).trim(),
        companyName: (v.companyName as string).trim(),
        location: nullable(v.location),
        startDate: v.startDate as string,
        endDate: v.isCurrent ? null : nullable(v.endDate),
        isCurrent: Boolean(v.isCurrent),
        description: nullable(v.description),
      })}
      renderPrimary={(x) => `${x.title} · ${x.companyName}`}
      renderSecondary={(x) => [range(x.startDate, x.endDate, x.isCurrent), x.location].filter(Boolean).join(' · ')}
    />
  );
}

// ---------------------------------------------------------------------------

export function EducationTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const range = useDateRange();
  const validateEdu = useRangeValidator('startDate', 'endDate');
  const validateCert = useRangeValidator('issueDate', 'expiryDate');

  return (
    <Stack spacing={4}>
      <ProfileListSection
        collection="educations"
        items={profile?.educations ?? []}
        title={t('profile.tabs.educationOnly')}
        addLabel={t('profile.add.education')}
        emptyText={t('profile.empty.education')}
        itemName={(x) => x.school}
        fields={[
          { name: 'school', label: t('profile.fields.school'), type: 'text', required: true, maxLength: 200 },
          {
            name: 'degree',
            label: t('profile.fields.degree'),
            type: 'select',
            required: true,
            half: true,
            options: DEGREES.map((d) => ({ value: d, label: t(`degree.${d}`) })),
          },
          { name: 'fieldOfStudy', label: t('profile.fields.fieldOfStudy'), type: 'text', maxLength: 200, half: true },
          { name: 'startDate', label: t('profile.fields.startDate'), type: 'date', half: true },
          { name: 'endDate', label: t('profile.fields.endDateOrExpected'), type: 'date', half: true },
          { name: 'gpa', label: t('profile.fields.gpa'), type: 'text', maxLength: 20, half: true, helperText: t('profile.hints.gpa') },
          { name: 'description', label: t('profile.fields.description'), type: 'multiline' },
        ]}
        validate={validateEdu}
        toForm={(x) => ({
          school: str(x?.school),
          degree: x?.degree ?? 'Bachelor',
          fieldOfStudy: str(x?.fieldOfStudy),
          startDate: str(x?.startDate),
          endDate: str(x?.endDate),
          gpa: str(x?.gpa),
          description: str(x?.description),
        })}
        toBody={(v) => ({
          school: (v.school as string).trim(),
          degree: v.degree as EducationDegree,
          fieldOfStudy: nullable(v.fieldOfStudy),
          startDate: nullable(v.startDate),
          endDate: nullable(v.endDate),
          gpa: nullable(v.gpa),
          description: nullable(v.description),
        })}
        renderPrimary={(x) => x.school}
        renderSecondary={(x) =>
          [t(`degree.${x.degree}`), x.fieldOfStudy, range(x.startDate, x.endDate), x.gpa && `GPA ${x.gpa}`].filter(Boolean).join(' · ')
        }
      />

      <ProfileListSection
        collection="certificates"
        items={profile?.certificates ?? []}
        title={t('profile.tabs.certificates')}
        addLabel={t('profile.add.certificate')}
        emptyText={t('profile.empty.certificate')}
        itemName={(x) => x.name}
        fields={[
          { name: 'name', label: t('profile.fields.certificateName'), type: 'text', required: true, maxLength: 200, half: true },
          { name: 'issuer', label: t('profile.fields.issuer'), type: 'text', maxLength: 200, half: true },
          { name: 'issueDate', label: t('profile.fields.issueDate'), type: 'date', half: true },
          { name: 'expiryDate', label: t('profile.fields.expiryDate'), type: 'date', half: true, helperText: t('profile.hints.noExpiry') },
          { name: 'credentialId', label: t('profile.fields.credentialId'), type: 'text', maxLength: 200, half: true },
          { name: 'credentialUrl', label: t('profile.fields.credentialUrl'), type: 'url', maxLength: 500, half: true },
        ]}
        validate={validateCert}
        toForm={(x) => ({
          name: str(x?.name),
          issuer: str(x?.issuer),
          issueDate: str(x?.issueDate),
          expiryDate: str(x?.expiryDate),
          credentialId: str(x?.credentialId),
          credentialUrl: str(x?.credentialUrl),
        })}
        toBody={(v) => ({
          name: (v.name as string).trim(),
          issuer: nullable(v.issuer),
          issueDate: nullable(v.issueDate),
          expiryDate: nullable(v.expiryDate),
          credentialId: nullable(v.credentialId),
          credentialUrl: nullable(v.credentialUrl),
        })}
        renderPrimary={(x) =>
          x.credentialUrl ? (
            <Link href={x.credentialUrl} target="_blank" rel="noopener noreferrer" underline="hover">
              {x.name}
            </Link>
          ) : (
            x.name
          )
        }
        renderSecondary={(x) => [x.issuer, range(x.issueDate, x.expiryDate)].filter(Boolean).join(' · ')}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------

export function LanguagesTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  return (
    <ProfileListSection
      collection="languages"
      items={profile?.languages ?? []}
      title={t('profile.tabs.languages')}
      addLabel={t('profile.add.language')}
      emptyText={t('profile.empty.language')}
      itemName={(x) => x.name}
      fields={[
        { name: 'name', label: t('profile.fields.languageName'), type: 'text', required: true, maxLength: 50, half: true },
        {
          name: 'level',
          label: t('profile.fields.level'),
          type: 'select',
          required: true,
          half: true,
          options: LEVELS.map((l) => ({ value: l, label: t(`languageLevel.${l}`) })),
        },
      ]}
      toForm={(x) => ({ name: str(x?.name), level: x?.level ?? 'B2' })}
      toBody={(v) => ({ name: (v.name as string).trim(), level: v.level as LanguageLevel })}
      renderPrimary={(x) => x.name}
      renderSecondary={(x) => t(`languageLevel.${x.level}`)}
    />
  );
}

// ---------------------------------------------------------------------------

export function ReferencesTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  return (
    <ProfileListSection
      collection="references"
      items={profile?.references ?? []}
      title={t('profile.tabs.references')}
      headerExtra={<PolicyButton field="References" inline />}
      addLabel={t('profile.add.reference')}
      emptyText={t('profile.empty.reference')}
      itemName={(x) => x.fullName}
      fields={[
        { name: 'fullName', label: t('auth.fullName'), type: 'text', required: true, maxLength: 200, half: true },
        { name: 'relationship', label: t('profile.fields.relationship'), type: 'text', maxLength: 100, half: true, helperText: t('profile.hints.relationship') },
        { name: 'company', label: t('board.fields.companyName'), type: 'text', maxLength: 200, half: true },
        { name: 'title', label: t('profile.fields.title'), type: 'text', maxLength: 200, half: true },
        { name: 'phoneNumber', label: t('profile.fields.phoneNumber'), type: 'tel', maxLength: 30, half: true },
        { name: 'email', label: t('auth.email'), type: 'email', maxLength: 254, half: true },
        { name: 'notes', label: t('board.fields.notes'), type: 'multiline', maxLength: 1000 },
      ]}
      toForm={(x) => ({
        fullName: str(x?.fullName),
        relationship: str(x?.relationship),
        company: str(x?.company),
        title: str(x?.title),
        phoneNumber: str(x?.phoneNumber),
        email: str(x?.email),
        notes: str(x?.notes),
      })}
      toBody={(v) => ({
        fullName: (v.fullName as string).trim(),
        relationship: nullable(v.relationship),
        company: nullable(v.company),
        title: nullable(v.title),
        phoneNumber: nullable(v.phoneNumber),
        email: nullable(v.email),
        notes: nullable(v.notes),
      })}
      renderPrimary={(x) => [x.fullName, x.relationship && `(${x.relationship})`].filter(Boolean).join(' ')}
      renderSecondary={(x) =>
        [[x.title, x.company].filter(Boolean).join(', '), x.phoneNumber, x.email].filter(Boolean).join(' · ')
      }
    />
  );
}

// ---------------------------------------------------------------------------

export function AnswersTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const all = profile?.screeningAnswers ?? [];
  const suggestions = t('profile.tagSuggestions', { returnObjects: true }) as string[];

  // Kullanilan tum etiketler (filtre cipleri icin), alfabetik.
  const usedTags = [...new Set(all.flatMap((a) => a.tags))].sort((a, b) => a.localeCompare(b));
  const items = activeTag ? all.filter((a) => a.tags.includes(activeTag)) : all;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t('profile.hints.answers')}
      </Typography>

      {usedTags.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip label={t('common.all')} color={activeTag === null ? 'primary' : 'default'} onClick={() => setActiveTag(null)} />
          {usedTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              color={activeTag === tag ? 'primary' : 'default'}
              variant={activeTag === tag ? 'filled' : 'outlined'}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            />
          ))}
        </Stack>
      )}

      <ProfileListSection
        collection="screening-answers"
        items={items}
        title={t('profile.tabs.answers')}
        addLabel={t('profile.add.answer')}
        emptyText={activeTag ? t('profile.empty.answerFiltered') : t('profile.empty.answer')}
        itemName={(x) => x.question}
        fields={[
          { name: 'question', label: t('profile.fields.question'), type: 'text', required: true, maxLength: 500 },
          { name: 'answer', label: t('profile.fields.answer'), type: 'multiline', required: true },
          { name: 'tags', label: t('profile.fields.tags'), type: 'tags', suggestions },
        ]}
        toForm={(x) => ({ question: str(x?.question), answer: str(x?.answer), tags: x?.tags ?? (activeTag ? [activeTag] : []) })}
        toBody={(v) => ({ question: (v.question as string).trim(), answer: (v.answer as string).trim(), tags: v.tags as string[] })}
        renderPrimary={(x) => x.question}
        renderSecondary={(x) => (
          <>
            <Box component="span" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
              {x.answer}
            </Box>
            {x.tags.length > 0 && (
              <Stack direction="row" sx={{ gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                {x.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                ))}
              </Stack>
            )}
          </>
        )}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------

export function ExtraTab({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t('profile.hints.customFields')}
      </Typography>
      <ProfileListSection
        collection="custom-fields"
        items={profile?.customFields ?? []}
        title={t('profile.tabs.extra')}
        addLabel={t('profile.add.customField')}
        emptyText={t('profile.empty.customField')}
        itemName={(x) => x.label}
        fields={[
          { name: 'label', label: t('profile.fields.label'), type: 'text', required: true, maxLength: 200, half: true, helperText: t('profile.hints.label') },
          { name: 'value', label: t('profile.fields.value'), type: 'text', required: true, maxLength: 2000, half: true },
          {
            name: 'policy',
            label: t('policy.title'),
            type: 'select',
            required: true,
            options: POLICIES.map((p) => ({ value: p, label: `${t(`policy.${p}`)} — ${t(`policy.${p}Hint`)}` })),
          },
        ]}
        toForm={(x) => ({ label: str(x?.label), value: str(x?.value), policy: x?.policy ?? 'Auto' })}
        toBody={(v) => ({ label: (v.label as string).trim(), value: (v.value as string).trim(), policy: v.policy as AutofillPolicy })}
        renderPrimary={(x) => (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <span>{x.label}</span>
            <Chip
              size="small"
              icon={POLICY_META[x.policy].icon}
              label={t(`policy.${x.policy}`)}
              color={POLICY_META[x.policy].color}
              variant="outlined"
              sx={{ height: 22 }}
            />
          </Stack>
        )}
        renderSecondary={(x) => x.value}
      />
    </Stack>
  );
}
