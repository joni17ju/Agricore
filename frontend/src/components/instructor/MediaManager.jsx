import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { removeMediaAsset, uploadMediaAsset } from '../../services/lessonService.js';
import Button, { IconButton } from '../common/Button.jsx';
import { EmptyState } from '../common/Display.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal, { ConfirmDialog } from '../common/Modal.jsx';
import MediaAsset from '../illustrations/MediaAsset.jsx';

/** Lesson media list with a mock upload that previews the file locally. */
export default function MediaManager({ lesson, onChanged, uploadOpen, onUploadOpenChange }) {
  const [assetToRemove, setAssetToRemove] = useState(null);
  const toast = useToast();

  const confirmRemove = async () => {
    try {
      await removeMediaAsset(lesson._id, assetToRemove.assetId);
      toast.success('Media removed.');
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
    setAssetToRemove(null);
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="text-muted text-sm">Photos, short instructional videos and 2D animations shown with this lesson.</p>
        <Button size="sm" icon="upload" onClick={() => onUploadOpenChange(true)}>Upload media</Button>
      </div>
      {lesson.mediaAssets.length === 0 ? (
        <EmptyState icon="image" title="No media yet" message="Upload images or videos to support this lesson." />
      ) : (
        <div className="media-manager__grid">
          {lesson.mediaAssets.map((asset) => (
            <div key={asset.assetId} className="media-manager__item anim-scale-in">
              <MediaAsset asset={asset} />
              <IconButton icon="trash" label="Remove media" variant="danger" size="sm" className="media-manager__remove" onClick={() => setAssetToRemove(asset)} />
            </div>
          ))}
        </div>
      )}

      <UploadModal lessonId={lesson._id} isOpen={uploadOpen} onClose={() => onUploadOpenChange(false)} onUploaded={onChanged} />
      <ConfirmDialog
        isOpen={Boolean(assetToRemove)}
        onClose={() => setAssetToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove media?"
        message={`“${assetToRemove?.title}” will be removed from this lesson.`}
        confirmLabel="Remove"
      />
    </div>
  );
}

function UploadModal({ lessonId, isOpen, onClose, onUploaded }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [type, setType] = useState('image');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const reset = () => {
    setFile(null);
    setPreviewUrl('');
    setTitle('');
    setCaption('');
    setError('');
    setType('image');
  };

  const pick = (picked) => {
    if (!picked) return;
    setError('');
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setType(picked.type.startsWith('video/') ? 'video' : 'image');
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
  };

  const close = () => {
    reset();
    onClose();
  };

  const upload = async () => {
    setIsUploading(true);
    setError('');
    try {
      await uploadMediaAsset(lessonId, file, { title, caption, type });
      toast.success('Media uploaded (stored locally in this browser).');
      onUploaded();
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Upload media"
      description="Prototype upload — files are previewed and saved in this browser only."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button icon="upload" onClick={upload} disabled={!file} isLoading={isUploading}>Upload</Button>
        </>
      }
    >
      <div className="stack">
        <label
          className={`dropzone ${isDragOver ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragOver(false); pick(event.dataTransfer.files[0]); }}
        >
          <input type="file" accept="image/*,video/*" onChange={(event) => pick(event.target.files[0])} className="visually-hidden" />
          {file ? (
            <div className="dropzone__preview anim-scale-in">
              {file.type.startsWith('video/') ? <video src={previewUrl} controls /> : <img src={previewUrl} alt="Preview" />}
              <span className="text-sm text-muted">{file.name} · {(file.size / 1024).toFixed(0)} KB · click to change</span>
            </div>
          ) : (
            <>
              <span className="dropzone__icon"><Icon name="upload" size={28} /></span>
              <strong>Drop an image or video here</strong>
              <span className="text-sm text-muted">or click to browse · max 1.5 MB in the prototype</span>
            </>
          )}
        </label>
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        <div className="form-grid">
          <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <SelectInput
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'image', label: 'Photograph / image' },
              { value: 'video', label: 'Instructional video' },
              { value: 'animation', label: '2D animation' },
            ]}
          />
          <div className="span-2">
            <TextInput label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Describe what students should notice" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
