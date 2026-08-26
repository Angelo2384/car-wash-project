import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useNotifications } from '../../../contexts/NotificationsContext';
import { cancelAppointment, type StoredAppointment } from '../../../lib/appointments';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, User } from 'lucide-react';

export default function CustomerCancel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();

  const appointment = location.state?.appointment as StoredAppointment | undefined;
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!appointment) {
      navigate('/dashboard/customer/appointments', { replace: true });
    }
  }, [appointment, navigate]);

  if (!appointment) {
    return null;
  }

  const handleConfirmCancellation = async () => {
    if (!reason.trim()) {
      showToast('Please provide a reason for cancellation', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await cancelAppointment(appointment.id, reason.trim(), currentUser?.uid);
      
      addNotification({
        category: 'appointments',
        icon: 'calendar',
        title: 'Appointment Cancelled',
        message: `Your appointment for ${appointment.packageName} on ${appointment.date} has been cancelled.`,
        link: '/dashboard/customer/appointments',
        eventId: `appt-cancel-${appointment.id}-${Date.now()}`,
      });

      showToast('Appointment has been successfully cancelled', 'info');
      navigate('/dashboard/customer/appointments');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[#F5F5F5]">
      {/* TopHeader/Title area */}
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => navigate('/dashboard/customer/appointments')}
          className="flex items-center gap-1.5 text-sm text-[#E86A33] hover:text-[#cc5a2a] transition-colors w-fit mb-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#E86A33]" />
          Back to Appointments
        </button>
        <h2 className="text-2xl font-bold font-display tracking-tight text-[#F5F5F5]">Cancellation</h2>
        <p className="text-[#A1A1AA] text-sm">Cancel your bookings</p>
      </div>

      {/* Centered Card */}
      <div className="max-w-2xl w-full mx-auto mt-4">
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-xl p-6 flex flex-col gap-6 shadow-sm">
          
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#F5F5F5]">Appointment Summary</h3>
            <span className="text-sm text-[#A1A1AA]">#{appointment.id}</span>
          </div>

          <div className="h-px bg-[#2C2C2C] -my-2" />

          {/* Summary Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1F1F1F] flex items-center justify-center overflow-hidden border border-[#2C2C2C]">
                <User className="w-5 h-5 text-[#E86A33]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#F5F5F5] font-medium">{appointment.staffName || 'Assigned Staff'}</span>
                <span className="text-sm text-[#A1A1AA]">{appointment.packageName}</span>
                <span className="text-xs text-[#71717A]">{appointment.date} • {appointment.time}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-[#A1A1AA]">Total Amount</span>
              <span className="text-lg font-bold text-[#F5F5F5]">{appointment.price}</span>
            </div>
          </div>

          <div className="h-px bg-[#2C2C2C] -my-2" />

          {/* Reason for cancellation Textarea */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[#A1A1AA] ml-1">
              Reason for cancellation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#101010] border text-[#F5F5F5] rounded-lg px-4 py-3 outline-none transition-all duration-200 placeholder:text-[#71717A] border-[#2C2C2C] focus:border-[#E86A33] focus:ring-1 focus:ring-[#E86A33] min-h-[120px] resize-y"
              placeholder="Please let us know why you need to cancel this appointment..."
              required
            />
          </div>

          {/* Button Row */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)} 
              className="!text-[#F5F5F5] !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
            >
              Go Back
            </Button>
            <Button 
              variant="primary" 
              disabled={!reason.trim() || isSubmitting}
              onClick={handleConfirmCancellation}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
