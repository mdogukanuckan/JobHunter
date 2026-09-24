import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Avatar, Box, Chip, Paper, Stack, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplicationSummary } from '../../api/types';
import { formatDate } from '../../utils/format';
import { avatarColors } from './boardUtils';

interface JobCardViewProps {
  item: JobApplicationSummary;
  /** DragOverlay icinde (imlecle birlikte hareket eden kopya) cizilirken true. */
  overlay?: boolean;
  /** Surukle-birak kullanilmayan yerde (mobil pano) false: imlec "tutma eli" yerine normal isaretci olur. */
  draggable?: boolean;
  /** Sirket adinin sagina yerlesen ek oge (mobilde "..." menusu). */
  action?: ReactNode;
}

/** Kartin sadece gorunumu. Hem listede hem de surukleme sirasindaki "hayalet" kopyada kullanilir. */
export function JobCardView({ item, overlay = false, draggable = true, action }: JobCardViewProps) {
  const { t, i18n } = useTranslation();
  const dateLabel = item.appliedAt
    ? t('board.card.applied', { date: formatDate(item.appliedAt, i18n.language) })
    : t('board.card.added', { date: formatDate(item.createdAt, i18n.language) });

  const theme = useTheme();
  const av = avatarColors(item.companyName, theme.palette.mode);

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: '18px',
        boxShadow: overlay ? 8 : theme.palette.app.shadow,
        cursor: overlay ? 'grabbing' : draggable ? 'grab' : 'pointer',
        transform: overlay ? 'rotate(2deg)' : undefined,
        transition: 'border-color 120ms',
        '&:hover': { borderColor: overlay ? undefined : 'primary.main' },
        userSelect: 'none',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 1.25 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: av.bg, color: av.fg, fontSize: 14, fontWeight: 800 }}>
          {item.companyName.charAt(0).toLocaleUpperCase()}
        </Avatar>
        <Typography sx={{ fontWeight: 800, fontSize: 14, minWidth: 0, flexGrow: 1 }} noWrap title={item.companyName}>
          {item.companyName}
        </Typography>
        {action}
      </Stack>
      <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, mb: 1.25 }} title={item.jobTitle}>
        {item.jobTitle}
      </Typography>

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        {item.location && (
          <Chip
            size="small"
            icon={<PlaceOutlinedIcon />}
            label={item.location}
            sx={{ bgcolor: 'app.surface2', color: 'text.secondary', maxWidth: 170, '& .MuiChip-icon': { fontSize: 15, color: 'inherit' } }}
          />
        )}
        {item.source && <Chip size="small" label={item.source} variant="outlined" />}
        {item.cvId && (
          <Box component="span" title={t('board.card.hasCv')} sx={{ display: 'inline-flex', color: 'text.secondary' }}>
            <DescriptionOutlinedIcon sx={{ fontSize: 17 }} />
          </Box>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
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
        borderRadius: '18px',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <JobCardView item={item} />
    </Box>
  );
}
