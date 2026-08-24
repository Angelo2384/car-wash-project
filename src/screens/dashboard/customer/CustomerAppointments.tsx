import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Lock, Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react';

export default function CustomerAppointments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[var(--color-charcoal)]">
      {/* TopHeader/Title area */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--color-burnt-orange)]">My Appointments</h2>
        <p className="text-[var(--color-burnt-orange)] text-sm">Manage your upcoming bookings and requests</p>
      </div>

      {/* Tabs and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-soft-gray)] pb-4">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`text-[var(--color-burnt-orange)] font-medium text-[15px] pb-4 -mb-[17px] transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-[var(--color-burnt-orange)]' : 'hover:opacity-80'}`}
          >
            Upcoming Appointments
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`text-[var(--color-burnt-orange)] font-medium text-[15px] pb-4 -mb-[17px] transition-colors ${activeTab === 'history' ? 'border-b-2 border-[var(--color-burnt-orange)]' : 'hover:opacity-80'}`}
          >
            History
          </button>
        </div>
        <Button variant="primary">
          + Book New Appointment
        </Button>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-4">
        
        {activeTab === 'upcoming' && (
          <>
            {/* Card 1: Staff on Route (locked) */}
            <AppointmentCard 
              status="Staff on route"
              statusColor="blue"
              date="Today, Oct 24"
              time="2:00 PM - 3:00 PM"
              location="123 Main St, Apartment Complex"
              vehicle="Tesla Model 3"
              price="R120.00"
              packageName="Premium Detail"
              staffName="Michael R."
              staffStatus="On Route - 15 mins away"
              isLocked={true}
            />

            {/* Card 2: Scheduled >24h (fee) */}
            <AppointmentCard 
              status="Scheduled"
              statusColor="burnt-orange"
              date="Tomorrow, Oct 25"
              time="10:00 AM - 11:30 AM"
              location="456 Oak Ave, Driveway"
              vehicle="Ford F-150"
              price="R150.00"
              packageName="Exterior & Interior Deep Clean"
              staffName="Sarah J."
              staffStatus="Assigned"
              isLocked={false}
              cancellationPolicy="Cancel before Oct 24, 10:00 AM for a full refund. 20% fee applies thereafter."
              onReschedule={() => navigate('/dashboard/customer/appointments/reschedule')}
              onCancel={() => navigate('/dashboard/customer/appointments/cancel')}
            />

            {/* Card 3: Scheduled with full refund */}
            <AppointmentCard 
              status="Refund Eligible"
              statusColor="reward-green"
              date="Fri, Oct 27"
              time="1:00 PM - 2:00 PM"
              location="789 Pine Ln, Office Park"
              vehicle="Honda Civic"
              price="R85.00"
              packageName="Standard Wash"
              staffName="Pending Assignment"
              staffStatus="Finding Staff..."
              isLocked={false}
              cancellationPolicy="Cancel before Oct 26, 1:00 PM for a full refund."
              onReschedule={() => navigate('/dashboard/customer/appointments/reschedule')}
              onCancel={() => navigate('/dashboard/customer/appointments/cancel')}
            />
          </>
        )}

        {activeTab === 'history' && (
          <>
            {/* Card 4: Missed */}
            <AppointmentCard 
              status="Missed"
              statusColor="red"
              date="Mon, Oct 20"
              time="9:00 AM - 10:00 AM"
              location="123 Main St, Apartment Complex"
              vehicle="Tesla Model 3"
              price="R120.00"
              packageName="Premium Detail"
              staffName="Michael R."
              staffStatus="Was Assigned"
              isLocked={true}
              isMissed={true}
              cancellationPolicy="You missed this appointment. Refund requests are subject to approval."
            />
          </>
        )}

      </div>
    </div>
  );
}

// Helper component for the Card to keep code clean
function AppointmentCard({ 
  status, statusColor, date, time, location, vehicle, price, 
  packageName, staffName, staffStatus, isLocked, cancellationPolicy, isMissed, onReschedule, onCancel
}: any) {
  
  const getBadgeStyles = (color: string) => {
    switch(color) {
      case 'burnt-orange': return 'bg-[var(--color-burnt-orange)]/10 text-[var(--color-burnt-orange)] border-[var(--color-burnt-orange)]/20';
      case 'reward-green': return 'bg-[var(--color-reward-green)]/10 text-[var(--color-reward-green)] border-[var(--color-reward-green)]/20';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-[var(--color-soft-gray)] text-[var(--color-charcoal)] border-[var(--color-charcoal-700)]';
    }
  };

  return (
    <div className="bg-[var(--color-off-white)] border border-[var(--color-soft-gray)] rounded-xl p-5 flex flex-col md:flex-row gap-6 transition-colors hover:border-[var(--color-charcoal-700)] shadow-sm">
      
      {/* Column 1: Status & Time */}
      <div className="flex-1 flex flex-col gap-3">
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyles(statusColor)}`}>
            {status}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center gap-2 text-[var(--color-charcoal)] font-medium">
            <Calendar className="w-4 h-4 text-[var(--color-burnt-orange)]" />
            {date}
          </div>
          <div className="flex items-center gap-2 text-[var(--color-charcoal-700)] text-sm">
            <Clock className="w-4 h-4 text-[var(--color-burnt-orange)]" />
            {time}
          </div>
          <div className="flex items-center gap-2 text-[var(--color-charcoal-700)] text-sm">
            <MapPin className="w-4 h-4 shrink-0 text-[var(--color-burnt-orange)]" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Column 2: Vehicle & Package Inner Card */}
      <div className="flex-[1.5] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg text-[var(--color-charcoal)]">{vehicle}</h3>
          <span className="font-bold text-[var(--color-charcoal)]">{price}</span>
        </div>
        
        <div className="bg-white border border-[var(--color-soft-gray)] rounded-lg p-3 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-charcoal)]">{packageName}</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-off-white-dark)] flex items-center justify-center overflow-hidden border border-[var(--color-soft-gray)]">
                <User className="w-3 h-3 text-[var(--color-burnt-orange)]" />
              </div>
              <span className="text-xs text-[var(--color-charcoal-700)]">{staffName} • {staffStatus}</span>
            </div>
          </div>
          <button className="text-[var(--color-charcoal-700)] hover:text-[var(--color-burnt-orange)] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Column 3: Actions & Policy */}
      <div className="flex-1 flex flex-col justify-between gap-4 border-t md:border-t-0 md:border-l border-[var(--color-soft-gray)] pt-4 md:pt-0 md:pl-6">
        <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
          {cancellationPolicy || "Cancellation policies apply. Review our terms for details on refunds and fees."}
        </p>
        
        <div className="flex flex-col gap-2">
          {isMissed ? (
            <Button variant="outline" fullWidth className="!text-[var(--color-charcoal)] !border-[var(--color-soft-gray)] hover:!border-[var(--color-charcoal-700)] hover:!text-[var(--color-charcoal)]">
              Request Refund
            </Button>
          ) : (
            <>
              <Button variant="outline" fullWidth disabled={isLocked} onClick={onReschedule} className="!text-[var(--color-charcoal)] !border-[var(--color-soft-gray)] hover:!border-[var(--color-charcoal-700)] hover:!text-[var(--color-charcoal)] disabled:!border-[var(--color-soft-gray)] disabled:!text-[var(--color-charcoal-700)]">
                {isLocked && <Lock className="w-3.5 h-3.5" />}
                Reschedule
              </Button>
              <Button variant="outline" fullWidth disabled={isLocked} onClick={onCancel} className="!text-[var(--color-charcoal)] !border-[var(--color-soft-gray)] hover:!border-[var(--color-charcoal-700)] hover:!text-[var(--color-charcoal)] disabled:!border-[var(--color-soft-gray)] disabled:!text-[var(--color-charcoal-700)]">
                {isLocked && <Lock className="w-3.5 h-3.5" />}
                Cancel Booking
              </Button>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}
