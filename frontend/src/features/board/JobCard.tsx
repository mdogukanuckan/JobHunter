import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { JobApplicationSummary } from '../../api/types';
import { formatDate } from '../../utils/format';
import { STATUS_COLORS } from './boardUtils';

interface JobCardViewProps {
  item: JobApplicationSummary;
  /** DragOverlay icinde (imlecle birlikte hareket eden kopya) cizilirken true. */
  overlay?: boolean;
}

/** Kartin sadece gorunumu. Hem listede hem de surukleme sirasindaki "hayalet" kopyada kullanilir. */
export function JobCardView({ item, overlay = false }: JobCardViewProps) {
  const { t, i18n } = useTranslation();
  const dateLabel = item.appliedAt
    ? t('board.card.applied', { date: formatDate(item.appliedAt, i18n.language) })
    : t('board.card.added', { date: formatDate(item.createdAt, i18n.language) });

  return (
    <Paper
      sx={{
        p: 1.5,
        borderLeft: `4px solid ${STATUS_COLORS[item.status]}`,
        cursor: overlay ? 'grabbing' : 'grab',
        boxShadow: overlay ? 6 : 0,
        transform: overlay ? 'rotate(2deg)' : undefined,
        '&:hover': { borderColor: overlay ? undefined : 'primary.light' },
        userSelect: 'none',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap title={item.companyName}>
        {item.companyName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap title={item.jobTitle}>
        {item.jobTitle}
      </Typography>

      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, alignItems: 'center' }}>
        {item.location && (
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: 'text.secondary', mr: 0.5 }}>
            <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
              {item.location}
            </Typography>
          </Stack>
        )}
        {item.source && <Chip label={item.source} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
        {item.cvId && (
          <Box component="span" title={t('board.card.hasCv')} sx={{ display: 'inline-flex', color: 'text.secondary' }}>
            <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
          </Box>
        )}
      </Stack>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
        {dateLabel}
      </Typography>
    </Paper>
  );
}

interface SortableJobCardProps {
  item: JobApplicationSummary;
  onOpen: (id: string) => void;
}

/**
 * Suruklenebilir kart. useSortable, dnd-kit'e "bu eleman siralanabilir bir listenin parcasi" der ve
 * surukleme icin gereken event handler'lari (listeners), erisilebilirlik niteliklerini (attributes)
 * ve anlik kaydirma bilgisini (transform) verir.
 */
export function SortableJobCard({ item, onOpen }: SortableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'card', status: item.status },
  });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // Tiklama: MouseSensor'daki 5px esigi sayesinde surukleme baslamadiysa click olarak gelir.
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        // Enter detay acar; Space ve oklar dnd-kit'in klavye surukleme kontrolleri icin serbest kalir.
        if (e.key === 'Enter') onOpen(item.id);
        listeners?.onKeyDown?.(e);
      }}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Surukelenen kartin listedeki yeri "bos yer tutucu" olarak soluk gorunur; asil kopya DragOverlay'de.
        opacity: isDragging ? 0.35 : 1,
        touchAction: 'manipulation',
        borderRadius: 2,
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <JobCardView item={item} />
    </Box>
  );
}
