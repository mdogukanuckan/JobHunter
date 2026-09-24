import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  Box,
  Button,
  ButtonBase,
  Divider,
  Fade,
  IconButton,
  ListItemIcon,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationSummary } from '../../api/types';
import type { BoardColumns } from './boardUtils';
import { JobCardView } from './JobCard';

interface MobileBoardProps {
  columns: BoardColumns;
  active: ApplicationStatus;
  onActiveChange: (status: ApplicationStatus) => void;
  onOpen: (id: string) => void;
  onAdd: (status: ApplicationStatus) => void;
  /** Karti baska duruma (sonuna) ya da ayni durumda baska siraya tasir. */
  onMove: (id: string, to: ApplicationStatus, index?: number) => void;
}

/** Yatay kaydirmanin "sekme degistir" sayilmasi icin gereken en az mesafe (px). */
const SWIPE_MIN = 60;

/*
 * Telefon icin pano. Alti sutunu yan yana sigdirmak yerine:
 *  - ustte kaydirilabilir durum sekmeleri (cip), her birinde kart sayisi;
 *  - secili durumun kartlari tam genislikte alt alta;
 *  - kart listesinde sola/saga kaydirinca yan duruma gecilir;
 *  - tasima sürükle-birak yerine kartin "..." menusunden (Tasi / Yukari / Asagi).
 * Masaustu gorunumu (BoardPage icindeki DndContext) degismez.
 */
export function MobileBoard({ columns, active, onActiveChange, onOpen, onAdd, onMove }: MobileBoardProps) {
  const { t } = useTranslation();
  const items = columns[active];
  const activeIndex = APPLICATION_STATUSES.indexOf(active);
  const chipRefs = useRef<Partial<Record<ApplicationStatus, HTMLElement | null>>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Secili sekme ekranin disinda kaldiysa gorunur alana kaydir (ozellikle kaydirma ile gecildiginde).
  useEffect(() => {
    chipRefs.current[active]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  const go = (delta: number) => {
    const next = APPLICATION_STATUSES[activeIndex + delta];
    if (next) onActiveChange(next);
  };

  const onTouchStart = (e: TouchEvent) => {
    const p = e.touches[0];
    touchStart.current = p ? { x: p.clientX, y: p.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    const p = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    // Sadece belirgin yatay hareket: dikey kaydirma (liste gezinme) sekme degistirmesin.
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  return (
    <Box>
      <Box
        role="tablist"
        aria-label={t('board.fields.status')}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          mx: -2, // sayfa kenarina kadar uzansin; ilk/son cip kenardan 16px icerde
          px: 2,
          pb: 1.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {APPLICATION_STATUSES.map((status) => {
          const selected = status === active;
          return (
            <ButtonBase
              key={status}
              ref={(el: HTMLButtonElement | null) => {
                chipRefs.current[status] = el;
              }}
              role="tab"
              aria-selected={selected}
              onClick={() => onActiveChange(status)}
              sx={(th) => ({
                flexShrink: 0,
                height: 38,
                px: 1.75,
                gap: 1,
                borderRadius: 999,
                fontSize: 14,
                fontWeight: selected ? 800 : 600,
                border: 1,
                borderColor: selected ? 'transparent' : 'divider',
                bgcolor: selected ? 'app.accentSoft' : 'background.paper',
                color: selected ? 'app.accentText' : 'text.secondary',
                transition: 'background-color 120ms, color 120ms',
                '&.Mui-focusVisible': { outline: `2px solid ${th.palette.primary.main}`, outlineOffset: 2 },
              })}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `status.${status}` }} />
              {t(`status.${status}`)}
              <Box component="span" sx={{ opacity: 0.75, fontWeight: 700 }}>
                {columns[status].length}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Kart listesi. Bos alanda da kaydirma calissin diye en az yarim ekran yuksekliginde. */}
      <Box role="tabpanel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} sx={{ minHeight: '55vh' }}>
        <Fade in key={active} timeout={180}>
          <Stack spacing={1.5}>
            {items.map((item, index) => (
              <Box
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(item.id)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(item.id)}
                sx={{ borderRadius: '18px', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}
              >
                <JobCardView
                  item={item}
                  draggable={false}
                  action={<CardMenu item={item} isFirst={index === 0} isLast={index === items.length - 1} onMove={onMove} />}
                />
              </Box>
            ))}

            {items.length === 0 && (
              <Stack
                sx={{ alignItems: 'center', gap: 1.5, py: 5, px: 2, border: '1.5px dashed', borderColor: 'divider', borderRadius: '18px' }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('board.mobile.emptyStatus', { status: t(`status.${active}`) })}
                </Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => onAdd(active)}>
                  {t('board.mobile.addHere')}
                </Button>
              </Stack>
            )}
          </Stack>
        </Fade>
      </Box>
    </Box>
  );
}

interface CardMenuProps {
  item: JobApplicationSummary;
  isFirst: boolean;
  isLast: boolean;
  onMove: MobileBoardProps['onMove'];
}

/** Kartin "..." menusu: siralama + baska duruma tasima. Tiklama karti acmasin diye olay yayilimi durdurulur. */
function CardMenu({ item, isFirst, isLast, onMove }: CardMenuProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t('board.mobile.cardActions')}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        sx={{ mr: -0.75, color: 'text.secondary' }}
      >
        <MoreHorizIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <MenuItem disabled={isFirst} onClick={() => run(() => onMove(item.id, item.status, item.position - 1))}>
          <ListItemIcon>
            <ArrowUpwardIcon fontSize="small" />
          </ListItemIcon>
          {t('board.mobile.moveUp')}
        </MenuItem>
        <MenuItem disabled={isLast} onClick={() => run(() => onMove(item.id, item.status, item.position + 1))}>
          <ListItemIcon>
            <ArrowDownwardIcon fontSize="small" />
          </ListItemIcon>
          {t('board.mobile.moveDown')}
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>{t('board.mobile.moveTo')}</ListSubheader>
        {APPLICATION_STATUSES.filter((s) => s !== item.status).map((status) => (
          <MenuItem key={status} onClick={() => run(() => onMove(item.id, status))}>
            <ListItemIcon>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: `status.${status}`, ml: 0.5 }} />
            </ListItemIcon>
            {t(`status.${status}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
