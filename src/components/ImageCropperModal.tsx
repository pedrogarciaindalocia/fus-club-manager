import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { X, ZoomIn, Scissors, Minus, Plus, RotateCcw, Crosshair } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedImage: Blob) => void;
  aspect?: number;
  cropShape?: 'rect' | 'round';
  title?: string;
  description?: string;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete,
  aspect = 1,
  cropShape = 'rect',
  title = "Recadrer & Ajuster l'Image",
  description = "Ajustez le cadrage et le zoom pour un rendu optimal"
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; inside: boolean }>({ x: 0, y: 0, inside: false });

  // Réinitialiser la position et le zoom à chaque nouvelle ouverture ou image
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, imageSrc]);

  const onCropChange = (newCrop: Point) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    sourceUrl: string,
    pixelCrop: Area,
  ): Promise<Blob> => {
    const image = await createImage(sourceUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Conserver la transparence (PNG avec alpha channel)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleConfirm = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedBlob);
        onClose();
      } catch (e) {
        console.error("Erreur lors de la génération du recadrage :", e);
      }
    }
  };

  const handleZoomStep = (delta: number) => {
    setZoom(prev => {
      const next = Number((prev + delta).toFixed(2));
      return Math.min(3, Math.max(1, next));
    });
  };

  const resetTransform = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="p-6 bg-secondary/10 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                {title}
              </DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {description}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-black/5">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div 
          className="relative h-96 w-full bg-slate-900 border-y border-white/5 select-none overflow-hidden"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursorPos({
              x: Math.round(e.clientX - rect.left),
              y: Math.round(e.clientY - rect.top),
              inside: true,
            });
          }}
          onMouseEnter={() => setCursorPos(prev => ({ ...prev, inside: true }))}
          onMouseLeave={() => setCursorPos(prev => ({ ...prev, inside: false }))}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={true}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={onZoomChange}
              classes={{
                containerClassName: 'rounded-none',
              }}
            />
          )}

          {/* Mire / Charte de positionnement XY du curseur en direct */}
          <div className="absolute bottom-3 left-3 z-30 pointer-events-none flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-white font-mono text-[10px] shadow-2xl">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-sans font-bold text-[9px] uppercase tracking-wider text-slate-400">Curseur XY :</span>
            </div>
            <span className="text-emerald-400 font-bold">X: {cursorPos.x}px</span>
            <span className="text-sky-400 font-bold">Y: {cursorPos.y}px</span>
            {croppedAreaPixels && (
              <span className="text-slate-400 text-[9px] border-l border-white/20 pl-2">
                Zone: {Math.round(croppedAreaPixels.width)}×{Math.round(croppedAreaPixels.height)}px
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 sm:p-8 space-y-6 sm:flex-col sm:items-stretch sm:space-x-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Niveau de Zoom
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-0.5 rounded-full">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetTransform}
                  title="Réinitialiser zoom et position"
                  className="h-6 w-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Barre de Zoom avec boutons - et + */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleZoomStep(-0.2)}
                disabled={zoom <= 1}
                className="h-9 w-9 rounded-xl shrink-0 border-secondary/60 hover:bg-secondary"
                title="Dézoomer"
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>

              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(value: number[]) => setZoom(value[0])}
                className="py-2 flex-1"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleZoomStep(0.2)}
                disabled={zoom >= 3}
                className="h-9 w-9 rounded-xl shrink-0 border-secondary/60 hover:bg-secondary"
                title="Zoomer"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Boutons d'accès direct au zoom */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 1.25, 1.5, 2, 2.5, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setZoom(val)}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all ${
                    Math.abs(zoom - val) < 0.04
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105'
                      : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-secondary/30">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Appliquer & Valider
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
