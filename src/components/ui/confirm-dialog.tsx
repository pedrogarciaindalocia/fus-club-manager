import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'destructive',
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              variant === 'destructive'
                ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                : "bg-primary/10 text-primary"
            )}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 mt-6 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 sm:flex-none h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider border-slate-200"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "flex-1 sm:flex-none h-10 px-5 rounded-xl font-black text-xs uppercase tracking-wider gap-2 shadow-md",
              variant === 'destructive' && "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
