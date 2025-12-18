import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ShiftCard } from './ShiftCard';
import { ShiftModal } from './ShiftModal';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Calendar = ({ store, currentWeekStart, onWeekChange }) => {
  const { token, user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingShift, setEditingShift] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (store) {
      fetchShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, currentWeekStart]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/shifts?store_id=${store.id}&week_start=${currentWeekStart}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShifts(response.data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const shiftId = active.id;
    const [dayIndex, timeSlot] = over.id.split('_');

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    if (shift.user_id !== user.id && user.role !== 'admin') {
      toast.error('You can only move your own shifts');
      return;
    }

    try {
      const conflictCheck = await axios.post(
        `${API}/shifts/check-conflict`,
        {
          store_id: store.id,
          day_of_week: parseInt(dayIndex),
          time_slot: timeSlot,
          week_start: currentWeekStart,
          exclude_shift_id: shiftId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (conflictCheck.data.has_conflict) {
        toast.error('Conflict detected! This slot is already taken.');
        return;
      }

      await axios.put(
        `${API}/shifts/${shiftId}`,
        {
          day_of_week: parseInt(dayIndex),
          time_slot: timeSlot
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Shift moved successfully');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to move shift');
    }
  };

  const handleAddShift = (dayIndex, timeSlot) => {
    setSelectedSlot({ dayIndex, timeSlot });
    setEditingShift(null);
    setModalOpen(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setSelectedSlot(null);
    setModalOpen(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;

    try {
      await axios.delete(`${API}/shifts/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Shift deleted');
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete shift');
    }
  };

  const handleApproveShift = async (shiftId) => {
    try {
      await axios.post(`${API}/shifts/${shiftId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Shift approved');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to approve shift');
    }
  };

  const handleRejectShift = async (shiftId) => {
    try {
      await axios.post(`${API}/shifts/${shiftId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Shift rejected');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to reject shift');
    }
  };

  const getShiftsForSlot = (dayIndex, timeSlot) => {
    return shifts.filter(
      s => s.day_of_week === dayIndex && s.time_slot === timeSlot
    );
  };

  const navigateWeek = (direction) => {
    const currentDate = parseISO(currentWeekStart);
    const newDate = addDays(currentDate, direction * 7);
    onWeekChange(format(newDate, 'yyyy-MM-dd'));
  };

  const getWeekDates = () => {
    const startDate = parseISO(currentWeekStart);
    return DAYS.map((day, index) => {
      const date = addDays(startDate, index);
      return { day, date: format(date, 'MMM dd') };
    });
  };

  const activeShift = activeId ? shifts.find(s => s.id === activeId) : null;

  return (
    <div className="space-y-6" data-testid="calendar-view">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigateWeek(-1)}
            variant="ghost"
            size="sm"
            className="gap-2"
            data-testid="prev-week-button"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Previous
          </Button>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Chivo, sans-serif' }} data-testid="week-display">
            Week of {format(parseISO(currentWeekStart), 'MMMM dd, yyyy')}
          </h2>
          <Button
            onClick={() => navigateWeek(1)}
            variant="ghost"
            size="sm"
            className="gap-2"
            data-testid="next-week-button"
          >
            Next
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-background border border-border" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-4 font-semibold text-sm text-muted-foreground" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Time
            </div>
            {getWeekDates().map(({ day, date }, index) => (
              <div
                key={index}
                className="p-4 border-l border-border text-center"
                data-testid={`day-header-${index}`}
              >
                <div className="font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>{day}</div>
                <div className="text-sm text-muted-foreground" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{date}</div>
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          {store.time_slots.map((timeSlot, slotIndex) => (
            <div key={slotIndex} className="grid grid-cols-8 border-b border-border min-h-[140px]">
              <div
                className="p-4 border-r border-border flex items-center"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span className="text-sm font-medium">{timeSlot}</span>
              </div>
              {DAYS.map((day, dayIndex) => {
                const slotShifts = getShiftsForSlot(dayIndex, timeSlot);
                const cellId = `${dayIndex}_${timeSlot}`;

                return (
                  <div
                    key={cellId}
                    id={cellId}
                    className="border-l border-border p-2 relative group"
                    data-testid={`calendar-cell-${dayIndex}-${slotIndex}`}
                  >
                    {slotShifts.length === 0 && (
                      <button
                        onClick={() => handleAddShift(dayIndex, timeSlot)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/50 cursor-pointer"
                        data-testid={`add-shift-button-${dayIndex}-${slotIndex}`}
                      >
                        <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                    )}

                    <div className="space-y-2">
                      {slotShifts.map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          onEdit={handleEditShift}
                          onDelete={handleDeleteShift}
                          onApprove={handleApproveShift}
                          onReject={handleRejectShift}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeShift ? (
            <div className="scale-105 rotate-1 cursor-grabbing">
              <ShiftCard shift={activeShift} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Shift Modal */}
      <ShiftModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        store={store}
        selectedSlot={selectedSlot}
        editingShift={editingShift}
        currentWeekStart={currentWeekStart}
        onSuccess={fetchShifts}
      />
    </div>
  );
};