import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { Box, Button, Chip, IconButton, Link, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import type { Interview, InterviewOutcome } from '../../api/types';
import { formatTime } from '../../utils/format';
import { OUTCOME_COLORS, OUTCOME_HEX, OUTCOMES } from './interviewUtils';

interface Props {
  interview: Interview;
  /** Liste gruplari gune gore oldugunda tarih yerine sadece saat gosterilir. */
  showDate?: boolean;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
  onOutcome: (interview: Interview, outcome: InterviewOutcome) => void;
}

export function InterviewCard({ interview: iv, showDate = false, onEdit, onDelete, onOutcome }: Props) {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const lng = i18n.language;

  const start = new Date(iv.scheduledAt);
  const end = iv.durationMinutes ? new Date(start.getTime() + iv.durationMinutes * 60_000) : null;
  const timeLabel = [
    showDate ? new Intl.DateTimeFormat(lng, { day: 'numeric', month: 'short', year: 'numeric' }).format(start) : null,
    `${formatTime(iv.scheduledAt, lng)}${end ? ` – ${formatTime(end.toISOString(), lng)}` : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Paper sx={{ p: 1.5, borderLeft: `4px solid ${OUTCOME_HEX[iv.outcome]}` }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, color: 'text.secondary', mb: 0.25 }}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {timeLabel}
            </Typography>
          </Stack>

          {/* Sirket adina tiklayinca panoda ilgili kartin detayi acilir. */}
          <Link component={RouterLink} to={`/?open=${iv.jobApplicationId}`} underline="hover" color="text.primary" sx={{ fontWeight: 700 }}>
            {iv.companyName}
          </Link>
          <Typography variant="body2" color="text.secondary" noWrap>
            {iv.jobTitle}
          </Typography>

          <Stack direction="row" sx={{ gap: 0.75, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip size="small" label={t(`interviewType.${iv.type}`)} />
            <Chip size="small" variant="outlined" label={t(`interviewFormat.${iv.format}`)} />
            {iv.location && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, color: 'text.secondary' }}>
                <PlaceOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{iv.location}</Typography>
              </Stack>
            )}
            {iv.interviewers && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, color: 'text.secondary' }}>
                <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{iv.interviewers}</Typography>
              </Stack>
            )}
          </Stack>

          {iv.preparationNotes && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {iv.preparationNotes}
            </Typography>
          )}
        </Box>

        <Stack sx={{ alignItems: 'flex-end', gap: 0.5 }}>
          <Chip
            size="small"
            color={OUTCOME_COLORS[iv.outcome]}
            label={t(`interviewOutcome.${iv.outcome}`)}
            onClick={(e) => setAnchor(e.currentTarget)}
            // Tiklanabilir oldugu anlasilsin diye
            sx={{ cursor: 'pointer' }}
          />
          <Stack direction="row">
            <Tooltip title={t('common.edit')}>
              <IconButton size="small" onClick={() => onEdit(iv)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton size="small" onClick={() => onDelete(iv)}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      {iv.meetingUrl && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VideocamOutlinedIcon />}
          endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
          href={iv.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mt: 1 }}
        >
          {t('interviews.join')}
        </Button>
      )}

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {OUTCOMES.map((o) => (
          <MenuItem
            key={o}
            selected={o === iv.outcome}
            onClick={() => {
              setAnchor(null);
              if (o !== iv.outcome) onOutcome(iv, o);
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: OUTCOME_HEX[o], mr: 1.5 }} />
            {t(`interviewOutcome.${o}`)}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
