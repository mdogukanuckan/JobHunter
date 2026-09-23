import { Alert, Box, Button, CircularProgress, Paper, Slide, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toMainFields } from '../../api/profile';
import type { ProfileMainFields } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { useCvsQuery } from '../board/useBoard';
import { AutomationTab } from './AutomationTab';
import { GeneralTab } from './GeneralTab';
import { AnswersTab, EducationTab, ExperienceTab, ExtraTab, LanguagesTab, ReferencesTab } from './ListTabs';
import { PersonalTab } from './PersonalTab';
import { useProfileQuery, useUpsertProfile } from './useProfile';

const TABS = ['general', 'personal', 'experience', 'education', 'languages', 'references', 'answers', 'extra', 'automation'] as const;
type TabKey = (typeof TABS)[number];

/*
 * Profil sayfasi.
 *  - Genel ve Kisisel sekmeleri profilin ana alanlarini duzenler. Bu alanlar tek bir PUT ile kaydedildigi icin
 *    iki sekme ortak bir taslak (draft) kullanir; alttaki kaydet cubugu ikisini birlikte kaydeder.
 *  - Liste sekmeleri (deneyim, egitim...) her kaydi kendi dialogunda aninda kaydeder.
 *  - Aktif sekme URL'de (?tab=...) tutulur: sayfa yenilense de ayni sekmede kalinir.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TABS.includes(tabParam) ? tabParam : 'general';

  const profileQuery = useProfileQuery();
  const cvsQuery = useCvsQuery();
  const upsert = useUpsertProfile();
  const profile = profileQuery.data ?? null;

  // Taslak: kullanici bir alani degistirene kadar null (sunucudaki veri gosterilir).
  const [draft, setDraft] = useState<ProfileMainFields | null>(null);
  const base = useMemo(() => toMainFields(profile), [profile]);
  const values = draft ?? base;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);

  const update = (patch: Partial<ProfileMainFields>) => setDraft((prev) => ({ ...(prev ?? base), ...patch }));

  const save = () => {
    if (values.expectedSalary !== null && !values.salaryCurrency) {
      notify(t('profile.errors.currencyRequired'), 'error');
      return;
    }
    upsert.mutate(values, {
      onSuccess: () => {
        setDraft(null);
        notify(t('common.savedMessage'));
      },
      onError: (error) => notify(getErrorMessage(error, t), 'error'),
    });
  };

  if (profileQuery.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (profileQuery.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void profileQuery.refetch()}>
            {t('common.retry')}
          </Button>
        }
      >
        {getErrorMessage(profileQuery.error, t)}
      </Alert>
    );
  }

  return (
    <Box sx={{ pb: dirty ? 10 : 0, maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('nav.profile')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('profile.subtitle')}
      </Typography>

      {!profile && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('profile.notCreated')}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_e, value: TabKey) => setSearchParams({ tab: value }, { replace: true })}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((key) => (
          <Tab key={key} value={key} label={t(`profile.tabs.${key}`)} />
        ))}
      </Tabs>

      {tab === 'general' && <GeneralTab profile={profile} values={values} update={update} cvs={cvsQuery.data ?? []} />}
      {tab === 'personal' && <PersonalTab values={values} update={update} />}
      {tab === 'experience' && <ExperienceTab profile={profile} />}
      {tab === 'education' && <EducationTab profile={profile} />}
      {tab === 'languages' && <LanguagesTab profile={profile} />}
      {tab === 'references' && <ReferencesTab profile={profile} />}
      {tab === 'answers' && <AnswersTab profile={profile} />}
      {tab === 'extra' && <ExtraTab profile={profile} />}
      {tab === 'automation' && <AutomationTab profile={profile} />}

      {/* Kaydedilmemis degisiklik varsa altta beliren kaydet cubugu (hangi sekmede olunursa olunsun). */}
      <Slide direction="up" in={dirty} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: { xs: 16, md: 232 + 24 },
            right: 16,
            maxWidth: 1000,
            px: 2,
            py: 1.5,
            zIndex: (theme) => theme.zIndex.appBar,
            border: 'none',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {t('profile.unsaved')}
            </Typography>
            <Button onClick={() => setDraft(null)} disabled={upsert.isPending}>
              {t('common.discard')}
            </Button>
            <Button variant="contained" onClick={save} loading={upsert.isPending}>
              {t('common.save')}
            </Button>
          </Stack>
        </Paper>
      </Slide>
    </Box>
  );
}
