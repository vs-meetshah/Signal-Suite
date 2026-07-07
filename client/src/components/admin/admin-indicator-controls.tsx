import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit3, Trash2, AlertTriangle, Shield } from "lucide-react";
import type { Indicator } from "@shared/schema";
import { IndicatorFormDialog } from "@/components/admin/admin-editor";

function useDeleteIndicatorMutation(onDone: () => void) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/indicators/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: "Indicator deleted" });
      onDone();
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: e.message }),
  });
}

function DeleteIndicatorDialog({
  indicator, open, onOpenChange, onDeleted,
}: {
  indicator: Indicator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteMutation = useDeleteIndicatorMutation(() => {
    onOpenChange(false);
    onDeleted?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-admin-delete-indicator">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /> Delete Indicator
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-semibold">{indicator?.name}</span>?
            This action cannot be undone. Existing user orders for this indicator will remain in history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-admin-cancel-delete"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => indicator && deleteMutation.mutate(indicator.id)}
            disabled={deleteMutation.isPending}
            data-testid="button-admin-confirm-delete"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCreateIndicatorButton({
  className,
  variant = "default",
  size = "sm",
  label = "New Indicator",
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        data-testid="button-admin-create-indicator"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
      <IndicatorFormDialog
        open={open}
        initial={null}
        isCreate
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function AdminIndicatorActions({
  indicator,
  variant = "card",
  onDeleted,
}: {
  indicator: Indicator;
  variant?: "card" | "toolbar";
  onDeleted?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (variant === "toolbar") {
    return (
      <>
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
          data-testid={`admin-toolbar-${indicator.id}`}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <Shield className="h-3.5 w-3.5" /> Admin
          </span>
          <span className="text-[11px] text-muted-foreground">Click any section's Edit button to change it. Use "Edit All Fields" to open the full form.</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setEditing(true)}
              data-testid={`button-admin-edit-toolbar-${indicator.id}`}
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit All Fields
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-red-600 hover:text-red-700 dark:text-red-400"
              onClick={() => setConfirmDelete(true)}
              data-testid={`button-admin-delete-toolbar-${indicator.id}`}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
        <IndicatorFormDialog
          open={editing}
          initial={indicator}
          isCreate={false}
          onClose={() => setEditing(false)}
        />
        <DeleteIndicatorDialog
          indicator={indicator}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onDeleted={onDeleted}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-md border border-amber-500/30 bg-background/90 p-1 shadow-md backdrop-blur"
        data-testid={`admin-overlay-${indicator.id}`}
        onClick={stop}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { stop(e); setEditing(true); }}
          aria-label={`Edit ${indicator.name}`}
          data-testid={`button-admin-edit-${indicator.id}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
          onClick={(e) => { stop(e); setConfirmDelete(true); }}
          aria-label={`Delete ${indicator.name}`}
          data-testid={`button-admin-delete-${indicator.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <IndicatorFormDialog
        open={editing}
        initial={indicator}
        isCreate={false}
        onClose={() => setEditing(false)}
      />
      <DeleteIndicatorDialog
        indicator={indicator}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={onDeleted}
      />
    </>
  );
}
