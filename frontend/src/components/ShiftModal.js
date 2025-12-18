import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_TYPES = ['morning', 'evening', 'night'];

export const ShiftModal = ({
  open,
  onOpenChange,
  store,
  selectedSlot,
  editingShift,
  currentWeekStart,
  onSuccess,
}) => {
  const { token } = useAuth();
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [timeSlot, setTimeSlot] = useState('');
  const [shiftType, setShiftType] = useState('morning');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingShift) {
      setDayOfWeek(editingShift.day_of_week);
      setTimeSlot(editingShift.time_slot);
      setShiftType(editingShift.shift_type);
      setNotes(editingShift.notes || '');
    } else if (selectedSlot) {
      setDayOfWeek(selectedSlot.dayIndex);
      setTimeSlot(selectedSlot.timeSlot);
      setShiftType('morning');
      setNotes('');
    }
  }, [editingShift, selectedSlot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingShift) {
        await axios.put(
          `${API}/shifts/${editingShift.id}`,
          { day_of_week: dayOfWeek, time_slot: timeSlot, shift_type: shiftType, notes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Shift updated successfully');
      } else {
        const conflictCheck = await axios.post(
          `${API}/shifts/check-conflict`,
          {
            store_id: store.id,
            day_of_week: dayOfWeek,
            time_slot: timeSlot,
            week_start: currentWeekStart,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (conflictCheck.data.has_conflict) {
          toast.error('Conflict detected! This slot is already taken.');
          setLoading(false);
          return;
        }

        await axios.post(
          `${API}/shifts`,
          {
            store_id: store.id,
            day_of_week: dayOfWeek,
            time_slot: timeSlot,
            shift_type: shiftType,
            notes,
            week_start: currentWeekStart,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Shift request created successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="shift-modal">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Chivo, sans-serif' }}>
            {editingShift ? 'Edit Shift' : 'Request Shift'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Day</Label>
            <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
              <SelectTrigger data-testid="shift-day-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Time Slot</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger data-testid="shift-time-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {store.time_slots.map((slot, index) => (
                  <SelectItem key={index} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Shift Type</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger data-testid="shift-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              className="bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-2"
              data-testid="shift-notes-input"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
              data-testid="shift-modal-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
              data-testid="shift-modal-submit"
            >
              {loading ? 'Saving...' : editingShift ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};