import ArticleIcon from '@mui/icons-material/Article';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CV_ACCEPT, CV_MAX_BYTES, cvsApi } from '../../api/cvs';
import { toMainFields } from '../../api/profile';
import type { Cv } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { useProfileQuery, useUpsertProfile } from '../profile/useProfile';
import { downloadCv, useCvsQuery, useDeleteCv, useRenameCv, useUploadCv } from './useCvs';

interface UploadItem {
  key: string;
  name: string;
  progress: number;
  error: string | null;
}

const isPdf = (cv: Cv) => cv.contentType === 'application/pdf';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CvsPage() {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const cvsQuery = useCvsQuery();
  const profileQuery = useProfileQuery();
  const upsertProfile = useUpsertProfile();
  const upload = useUploadCv();
  const rename = useRenameCv();
  const remove = useDeleteCv();

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [renaming, setRenaming] = useState<Cv | null>(null);
  const [deleting, setDeleting] = useState<Cv | null>(null);
  const [preview, setPreview] = useState<{ cv: Cv; url: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultCvId = profileQuery.data?.defaultCvId ?? null;

  // ---------- Yukleme ----------

  const patchUpload = (key: string, patch: Partial<UploadItem>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const handleFiles = async (files: FileList | File[]) => {
    // Dosyalar sirayla yuklenir (ayni anda 5 buyuk istek atmamak icin).
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${Date.now()}`;
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

      // Istemci tarafi on kontrol; backend ayrica dosya icerigini (magic number) da dogruluyor.
      let error: string | null = null;
      if (!CV_ACCEPT.split(',').includes(ext)) error = t('cvs.errors.type');
      else if (file.size > CV_MAX_BYTES) error = t('cvs.errors.size', { mb: CV_MAX_BYTES / (1024 * 1024) });

      setUploads((list) => [...list, { key, name: file.name, progress: 0, error }]);
      if (error) continue;

      try {
        await upload.mutateAsync({ file, onProgress: (progress) => patchUpload(key, { progress }) });
        setUploads((list) => list.filter((u) => u.key !== key));
        notify(t('cvs.uploaded', { name: file.name }));
      } catch (e) {
        patchUpload(key, { error: getErrorMessage(e, t) });
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
  };

  // ---------- Islemler ----------

  const openPreview = async (cv: Cv) => {
    setBusyId(cv.id);
    try {
      const blob = await cvsApi.downloadBlob(cv.id);
      // Tarayicinin PDF goruntuleyicisi Blob URL'i iframe icinde acabilir.
      setPreview({ cv, url: URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })) });
    } catch (e) {
      notify(getErrorMessage(e, t), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const download = async (cv: Cv) => {
    setBusyId(cv.id);
    try {
      await downloadCv(cv.id, cv.originalFileName);
    } catch (e) {
      notify(getErrorMessage(e, t), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleDefault = (cv: Cv) => {
    // Profil PUT'u tum ana alanlari ister: mevcut profili alip sadece varsayilan CV'yi degistiriyoruz.
    const next = defaultCvId === cv.id ? null : cv.id;
    upsertProfile.mutate(
      { ...toMainFields(profileQuery.data ?? null), defaultCvId: next },
      {
        onSuccess: () => notify(next ? t('cvs.defaultSet', { name: cv.name }) : t('cvs.defaultCleared')),
        onError: (e) => notify(getErrorMessage(e, t), 'error'),
      },
    );
  };

  // ---------- Cizim ----------

  const cvs = cvsQuery.data ?? [];

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t('nav.cvs')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('cvs.subtitle')}
      </Typography>

      {/* Surukle-birak alani. Tiklaninca gizli dosya secicisi acilir. */}
      <Paper
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        sx={{
          p: 4,
          mb: 2,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          transition: 'all 120ms',
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <CloudUploadIcon color={dragActive ? 'primary' : 'action'} sx={{ fontSize: 40, mb: 1 }} />
        <Typography sx={{ fontWeight: 600 }}>{t('cvs.dropTitle')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('cvs.dropHint', { mb: CV_MAX_BYTES / (1024 * 1024) })}
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept={CV_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = ''; // ayni dosya tekrar secilebilsin
          }}
        />
      </Paper>

      {uploads.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {uploads.map((u) => (
            <Paper key={u.key} sx={{ p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }} noWrap>
                  {u.name}
                </Typography>
                {u.error && (
                  <Button size="small" onClick={() => setUploads((list) => list.filter((x) => x.key !== u.key))}>
                    {t('common.close')}
                  </Button>
                )}
              </Stack>
              {u.error ? (
                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                  {u.error}
                </Alert>
              ) : (
                <LinearProgress variant="determinate" value={u.progress} sx={{ mt: 1 }} />
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {cvsQuery.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : cvsQuery.isError ? (
        <Alert severity="error">{getErrorMessage(cvsQuery.error, t)}</Alert>
      ) : cvs.length === 0 ? (
        <Typography color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
          {t('cvs.empty')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {cvs.map((cv) => {
            const isDefault = cv.id === defaultCvId;
            return (
              <Paper key={cv.id} sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                {isPdf(cv) ? <PictureAsPdfIcon sx={{ color: '#dc2626' }} /> : <ArticleIcon sx={{ color: '#2563eb' }} />}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {cv.name}
                    </Typography>
                    {isDefault && <Chip size="small" color="primary" label={t('cvs.default')} sx={{ height: 20 }} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {cv.originalFileName} · {formatSize(cv.sizeBytes)} · {formatDate(cv.createdAt, i18n.language)}
                  </Typography>
                </Box>

                {busyId === cv.id && <CircularProgress size={18} />}
                <Stack direction="row">
                  <Tooltip title={isDefault ? t('cvs.unsetDefault') : t('cvs.setDefault')}>
                    <IconButton onClick={() => toggleDefault(cv)} disabled={upsertProfile.isPending} color={isDefault ? 'primary' : 'default'}>
                      {isDefault ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Tooltip>
                  {isPdf(cv) && (
                    <Tooltip title={t('cvs.preview')}>
                      <IconButton onClick={() => void openPreview(cv)} disabled={busyId !== null}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={t('cvs.download')}>
                    <IconButton onClick={() => void download(cv)} disabled={busyId !== null}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('cvs.rename')}>
                    <IconButton
                      onClick={() => {
                        rename.reset();
                        setRenaming(cv);
                      }}
                    >
                      <DriveFileRenameOutlineIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton
                      onClick={() => {
                        remove.reset();
                        setDeleting(cv);
                      }}
                    >
                      <DeleteOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <RenameDialog
        cv={renaming}
        loading={rename.isPending}
        error={rename.error ? getErrorMessage(rename.error, t) : null}
        onClose={() => setRenaming(null)}
        onSubmit={(name) =>
          renaming &&
          rename.mutate(
            { id: renaming.id, name },
            {
              onSuccess: () => {
                setRenaming(null);
                notify(t('common.savedMessage'));
              },
            },
          )
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('cvs.deleteTitle')}
        message={deleting ? t('cvs.deleteMessage', { name: deleting.name }) : ''}
        loading={remove.isPending}
        error={remove.error ? getErrorMessage(remove.error, t) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              notify(t('common.deletedMessage'));
            },
          })
        }
      />

      <PreviewDialog preview={preview} onClose={closePreview} onDownload={(cv) => void download(cv)} />
    </Box>
  );
}

function RenameDialog({
  cv,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  cv: Cv | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  // Dialog her acildiginda mevcut adla baslasin.
  useEffect(() => {
    if (cv) setName(cv.name);
  }, [cv]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <Dialog open={cv !== null} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('cvs.rename')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label={t('cvs.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={t('cvs.nameHint')}
            slotProps={{ htmlInput: { maxLength: 150 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" loading={loading} disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function PreviewDialog({
  preview,
  onClose,
  onDownload,
}: {
  preview: { cv: Cv; url: string } | null;
  onClose: () => void;
  onDownload: (cv: Cv) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog open={preview !== null} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 2 }}>{preview?.cv.name}</DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: { xs: '100%', md: '80vh' } }}>
        {preview && (
          <Box component="iframe" src={preview.url} title={preview.cv.name} sx={{ border: 0, width: '100%', height: '100%', display: 'block' }} />
        )}
      </DialogContent>
      <DialogActions>
        {preview && (
          <Button startIcon={<DownloadIcon />} onClick={() => onDownload(preview.cv)}>
            {t('cvs.download')}
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
