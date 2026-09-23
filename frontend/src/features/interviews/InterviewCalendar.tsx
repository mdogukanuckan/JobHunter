import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Interview } from '../../api/types';
import { formatTime, localDayKey } from '../../utils/format';
import { OUTCOME_HEX } from './interviewUtils';

interface Props {
  interviews: Interview[];
  onSelect: (interview: Interview) => void;
  /** Bos bir gune tiklaninca o gun icin yeni mulakat. */
  onCreateOnDay: (day: Date) => void;
}

/**
 * Aylik takvim (kutuphanesiz). Hafta pazartesi baslar; 6 satir x 7 gun = 42 hucre sabit,
 * boylece ay degistikce yukseklik ziplamaz.
 */
export function InterviewCalendar({ interviews, onSelect, onCreateOnDay }: Props) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Mulakatlari yerel gune gore grupla.
  const byDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of interviews) {
      const key = localDayKey(new Date(iv.scheduledAt));
      map.set(key, [...(map.get(key) ?? []), iv]);
    }
    return map;
  }, [interviews]);

  // Ayin ilk gununun haftanin kacinci gunu oldugu (pazartesi = 0).
  const offset = (cursor.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset + i));
  const todayKey = localDayKey(new Date());

  // Hafta gunu basliklari: 2024-01-01 bir pazartesi.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lng, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)),
  );

  const move = (months: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1));

  return (
    <Paper sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5, gap: 1 }}>
        <IconButton onClick={() => move(-1)} aria-label={t('interviews.prevMonth')}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
          {new Intl.DateTimeFormat(lng, { month: 'long', year: 'numeric' }).format(cursor)}
        </Typography>
        <IconButton onClick={() => move(1)} aria-label={t('interviews.nextMonth')}>
          <ChevronRightIcon />
        </IconButton>
        <Button
          size="small"
          onClick={() => {
            const d = new Date();
            setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          {t('interviews.today')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', bgcolor: 'divider', border: '1px solid', borderColor: 'divider' }}>
        {weekdays.map((w) => (
          <Box key={w} sx={{ bgcolor: 'background.paper', py: 0.75, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              {w}
            </Typography>
          </Box>
        ))}

        {cells.map((day) => {
          const key = localDayKey(day);
          const items = byDay.get(key) ?? [];
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = key === todayKey;

          return (
            <Box
              key={key}
              onClick={() => onCreateOnDay(day)}
              sx={{
                bgcolor: inMonth ? 'background.paper' : 'action.hover',
                minHeight: { xs: 64, md: 104 },
                p: 0.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  fontWeight: isToday ? 700 : 500,
                  bgcolor: isToday ? 'primary.main' : 'transparent',
                  color: isToday ? 'primary.contrastText' : inMonth ? 'text.primary' : 'text.disabled',
                }}
              >
                {day.getDate()}
              </Typography>

              <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                {items.map((iv) => (
                  <Tooltip key={iv.id} title={`${formatTime(iv.scheduledAt, lng)} · ${iv.companyName} – ${t(`interviewType.${iv.type}`)}`}>
                    <Box
                      onClick={(e) => {
                        e.stopPropagation(); // gun hucresinin "yeni mulakat" tiklamasini tetiklemesin
                        onSelect(iv);
                      }}
                      sx={{
                        px: 0.5,
                        borderRadius: 1,
                        bgcolor: OUTCOME_HEX[iv.outcome],
                        color: '#fff',
                        fontSize: 11,
                        lineHeight: '18px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        opacity: iv.outcome === 'Cancelled' ? 0.6 : 1,
                        textDecoration: iv.outcome === 'Cancelled' ? 'line-through' : 'none',
                      }}
                    >
                      {/* Mobilde sadece saat, genis ekranda saat + sirket */}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {formatTime(iv.scheduledAt, lng)}
                      </Box>
                      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                        {' '}
                        {iv.companyName}
                      </Box>
                    </Box>
                  </Tooltip>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
