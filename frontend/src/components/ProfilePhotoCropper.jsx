import { useEffect, useRef, useState } from "react";

export default function ProfilePhotoCropper({ source, onCancel, onSave }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current, img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    ctx.clearRect(0,0,size,size);
    const base = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const scale = base * zoom;
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, (size-w)/2 + offset.x, (size-h)/2 + offset.y, w, h);
  };

  useEffect(() => { const img = new Image(); img.onload=()=>{ imageRef.current=img; draw(); }; img.src=source; }, [source]);
  useEffect(draw, [zoom, offset]);

  const start = e => { const p=e.touches?.[0]||e; drag.current={x:p.clientX,y:p.clientY,ox:offset.x,oy:offset.y}; };
  const move = e => { if(!drag.current)return; const p=e.touches?.[0]||e; setOffset({x:drag.current.ox+p.clientX-drag.current.x,y:drag.current.oy+p.clientY-drag.current.y}); };
  const stop = () => { drag.current=null; };

  const save = () => {
    const canvas=canvasRef.current;
    let quality=.9, value=canvas.toDataURL("image/jpeg",quality);
    while (value.length * .75 > 2*1024*1024 && quality>.45) { quality-=.08; value=canvas.toDataURL("image/jpeg",quality); }
    onSave(value);
  };

  return <div className="photo-crop-backdrop" onMouseMove={move} onMouseUp={stop} onTouchMove={move} onTouchEnd={stop}>
    <div className="photo-crop-panel">
      <div className="photo-crop-head"><div><small>PADLETIC</small><h2>Ustaw zdjęcie</h2></div><button type="button" onClick={onCancel}>×</button></div>
      <div className="photo-crop-stage" onMouseDown={start} onTouchStart={start}><canvas ref={canvasRef} width="720" height="720" /></div>
      <p>Przesuń zdjęcie w okręgu i dopasuj powiększenie.</p>
      <label className="photo-crop-zoom">Pomniejsz <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/> Powiększ</label>
      <div className="photo-crop-actions"><button type="button" onClick={onCancel}>Anuluj</button><button type="button" className="primary" onClick={save}>Użyj zdjęcia</button></div>
    </div>
  </div>;
}
