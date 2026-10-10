import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { X, ZoomIn, Scissors } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedImage: Blob) => void;
  aspect?: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete,
  aspect = 1
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
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
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Preserve transparency — do NOT fill background before drawing
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

    // PNG preserves alpha channel (transparency); JPEG does not
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
        console.error(e);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="p-6 bg-secondary/10 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Refine Portrait
              </DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Adjust Crop & Zoom for maximum impact</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-black/5">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative h-96 w-full bg-slate-900 border-y border-white/5">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={onZoomChange}
              classes={{
                containerClassName: 'rounded-none',
              }}
            />
          )}
        </div>

        <DialogFooter className="p-8 space-y-6 sm:flex-col sm:items-stretch sm:space-x-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <ZoomIn className="w-4 h-4 text-muted-foreground opacity-40" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zoom Level</span>
              </div>
              <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
               value={[zoom]}
               min={1}
               max={3}
               step={0.1}
               onValueChange={(value: number[]) => setZoom(value[0])}
               className="py-2"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-secondary/30">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">Discard</Button>
            <Button onClick={handleConfirm} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">Apply & Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
