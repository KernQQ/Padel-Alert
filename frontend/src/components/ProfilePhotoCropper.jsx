import { useEffect, useRef, useState } from "react";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się otworzyć zdjęcia."));
    image.src = src;
  });
}

function ProfilePhotoCropper({ source, onCancel, onSave }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError("");

    loadImage(source)
      .then((loaded) => {
        if (active) setImage(loaded);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [source]);

  function getBaseScale(size) {
    if (!image) return 1;
    return Math.max(size / image.width, size / image.height);
  }

  function clampOffset(next, size, nextZoom = zoom) {
    if (!image) return next;
    const scale = getBaseScale(size) * nextZoom;
    const renderedWidth = image.width * scale;
    const renderedHeight = image.height * scale;
    const maxX = Math.max(0, (renderedWidth - size) / 2);
    const maxY = Math.max(0, (renderedHeight - size) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y))
    };
  }

  function startDrag(event) {
    if (!image) return;
    const point = event.touches?.[0] || event;
    dragRef.current = {
      x: point.clientX,
      y: point.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
  }

  function moveDrag(event) {
    if (!dragRef.current || !image) return;
    const point = event.touches?.[0] || event;
    const size = viewportRef.current?.clientWidth || 320;
    const next = {
      x: dragRef.current.offsetX + point.clientX - dragRef.current.x,
      y: dragRef.current.offsetY + point.clientY - dragRef.current.y
    };
    setOffset(clampOffset(next, size));
  }

  function endDrag() {
    dragRef.current = null;
  }

  function changeZoom(value) {
    const nextZoom = Number(value);
    const size = viewportRef.current?.clientWidth || 320;
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, size, nextZoom));
  }

  async function save() {
    if (!image || saving) return;
    setSaving(true);
    setError("");

    try {
      const viewportSize = viewportRef.current?.clientWidth || 320;
      const outputSize = 512;
      const baseScale = getBaseScale(viewportSize);
      const renderedScale = baseScale * zoom;
      const renderedWidth = image.width * renderedScale;
      const renderedHeight = image.height * renderedScale;
      const imageLeft = (viewportSize - renderedWidth) / 2 + offset.x;
      const imageTop = (viewportSize - renderedHeight) / 2 + offset.y;
      const cropSize = viewportSize * 0.84;
      const cropLeft = (viewportSize - cropSize) / 2;
      const cropTop = (viewportSize - cropSize) / 2;
      const sourceX = Math.max(0, (cropLeft - imageLeft) / renderedScale);
      const sourceY = Math.max(0, (cropTop - imageTop) / renderedScale);
      const sourceSize = Math.min(cropSize / renderedScale, image.width, image.height);

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize
      );

      let quality = 0.84;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 650000 && quality > 0.58) {
        quality -= 0.08;
        result = canvas.toDataURL("image/jpeg", quality);
      }

      onSave(result);
    } catch (saveError) {
      setError(saveError.message || "Nie udało się przyciąć zdjęcia.");
      setSaving(false);
    }
  }

  if (!source) return null;

  const size = viewportRef.current?.clientWidth || 320;
  const baseScale = image ? getBaseScale(size) : 1;
  const renderedWidth = image ? image.width * baseScale * zoom : 0;
  const renderedHeight = image ? image.height * baseScale * zoom : 0;

  return (
    <div className="photo-crop-backdrop" onMouseUp={endDrag} onTouchEnd={endDrag}>
      <section className="photo-crop-modal" onClick={(event) => event.stopPropagation()}>
        <header className="photo-crop-head">
          <button type="button" onClick={onCancel}>←</button>
          <div>
            <small>Zdjęcie profilowe</small>
            <h2>Ustaw kadr</h2>
          </div>
          <button type="button" className="photo-crop-save-link" onClick={save} disabled={!image || saving}>
            {saving ? "Zapisuję…" : "Zapisz"}
          </button>
        </header>

        <div
          ref={viewportRef}
          className="photo-crop-viewport"
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseLeave={endDrag}
          onTouchStart={startDrag}
          onTouchMove={moveDrag}
        >
          {image && (
            <img
              src={source}
              alt="Podgląd kadrowania"
              draggable="false"
              style={{
                width: renderedWidth,
                height: renderedHeight,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
              }}
            />
          )}
          <div className="photo-crop-mask" aria-hidden="true" />
          <div className="photo-crop-ring" aria-hidden="true" />
          {!image && !error && <div className="photo-crop-loading">Wczytuję zdjęcie…</div>}
        </div>

        <div className="photo-crop-controls">
          <span>−</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => changeZoom(event.target.value)}
            aria-label="Powiększenie zdjęcia"
          />
          <span>＋</span>
        </div>

        <p className="photo-crop-hint">Przesuń zdjęcie palcem i ustaw twarz wewnątrz okręgu.</p>
        {error && <div className="form-message">{error}</div>}

        <div className="photo-crop-actions">
          <button type="button" onClick={onCancel}>Anuluj</button>
          <button type="button" className="primary-action" onClick={save} disabled={!image || saving}>
            {saving ? "Przygotowuję…" : "Użyj zdjęcia"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ProfilePhotoCropper;
