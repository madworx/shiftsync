import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useAuth } from '../contexts/AuthContext';
import { GripVertical, Check, X, Trash2, Edit } from 'lucide-react';
import { Button } from './ui/button';

const SHIFT_TYPE_STYLES = {
  morning: 'bg-orange-100 text-orange-900 border-l-4 border-orange-500',
  evening: 'bg-blue-100 text-blue-900 border-l-4 border-blue-500',
  night: 'bg-purple-100 text-purple-900 border-l-4 border-purple-500',
};

const STATUS_STYLES = {
  pending: 'border-yellow-500 bg-yellow-50',
  approved: '',
  rejected: 'border-red-500 bg-red-50 opacity-60',
};

export const ShiftCard = ({ shift, onEdit, onDelete, onApprove, onReject, isDragging = false }) => {
  const { user } = useAuth();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: shift.id,
  });

  const isOwner = shift.user_id === user?.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const shiftTypeClass = SHIFT_TYPE_STYLES[shift.shift_type] || '';
  const statusClass = STATUS_STYLES[shift.status] || '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-background rounded shadow-sm transition-all hover:shadow-md group ${
        shiftTypeClass
      } ${statusClass} ${isDragging ? 'shadow-xl' : ''}`}
      data-testid={`shift-card-${shift.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {canEdit && (
              <div
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing"
                data-testid={`shift-drag-handle-${shift.id}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
            <span className="font-semibold text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {shift.user_name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="capitalize">{shift.shift_type}</div>
            {shift.notes && <div className="italic truncate">{shift.notes}</div>}
            {shift.status === 'pending' && (
              <div className="font-semibold text-yellow-700">Pending Approval</div>
            )}
            {shift.status === 'rejected' && (
              <div className="font-semibold text-red-700">Rejected</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {isAdmin && shift.status === 'pending' && (
            <>
              <Button
                onClick={() => onApprove(shift.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                data-testid={`approve-shift-${shift.id}`}
              >
                <Check className="w-4 h-4" strokeWidth={1.5} />
              </Button>
              <Button
                onClick={() => onReject(shift.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                data-testid={`reject-shift-${shift.id}`}
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </>
          )}
          {canEdit && (
            <>
              <Button
                onClick={() => onEdit(shift)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`edit-shift-${shift.id}`}
              >
                <Edit className="w-3 h-3" strokeWidth={1.5} />
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => onDelete(shift.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`delete-shift-${shift.id}`}
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};