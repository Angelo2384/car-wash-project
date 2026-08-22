import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, User } from 'lucide-react';

export default function CustomerCancel() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[var(--color-charcoal)]">
      {/* TopHeader/Title area */}
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => navigate('/dashboard/customer/appointments')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-burnt-orange)] hover:opacity-80 transition-colors w-fit mb-2"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-burnt-orange)]" />
          Back to Appointments
        </button>
        <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--color-burnt-orange)]">Cancellation</h2>
        <p className="text-[var(--color-burnt-orange)] text-sm">Cancel your bookings</p>
      </div>

      {/* Centered Card */}
      <div className="max-w-2xl w-full mx-auto mt-4">
        <div className="bg-[var(--color-off-white)] border border-[var(--color-soft-gray)] rounded-xl p-6 flex flex-col gap-6 shadow-sm">
          
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--color-charcoal)]">Appointment Summary</h3>
            <span className="text-sm text-[var(--color-charcoal-700)]">#12345678</span>
          </div>

          <div className="h-px bg-[var(--color-soft-gray)] -my-2" />

          {/* Summary Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-off-white-dark)] flex items-center justify-center overflow-hidden border border-[var(--color-soft-gray)]">
                <User className="w-5 h-5 text-[var(--color-burnt-orange)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--color-charcoal)] font-medium">Alex Burns</span>
                <span className="text-sm text-[var(--color-charcoal-700)]">Exterior & Interior Deep Clean</span>
                <span className="text-xs text-[var(--color-charcoal-700)]">Tomorrow, Oct 25 • 10:00 AM</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-[var(--color-charcoal-700)]">Total Amount</span>
              <span className="text-lg font-bold text-[var(--color-charcoal)]">R150.00</span>
            </div>
          </div>

          <div className="h-px bg-[var(--color-soft-gray)] -my-2" />

          {/* Reason for cancellation Textarea */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[var(--color-charcoal-700)] ml-1">
              Reason for cancellation *
            </label>
            <textarea
              className="w-full bg-white border text-[var(--color-charcoal)] rounded-lg px-4 py-3 outline-none transition-all duration-200 placeholder:text-[var(--color-charcoal-700)] border-[var(--color-soft-gray)] focus:border-[var(--color-burnt-orange)] focus:ring-1 focus:ring-[var(--color-burnt-orange)] min-h-[120px] resize-y"
              placeholder="Please let us know why you need to cancel this appointment..."
              required
            />
          </div>

          {/* Button Row */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="!text-[var(--color-charcoal)] !border-[var(--color-soft-gray)] hover:!border-[var(--color-charcoal-700)] hover:!text-[var(--color-charcoal)]">
              Go Back
            </Button>
            <Button variant="primary">
              Confirm
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
