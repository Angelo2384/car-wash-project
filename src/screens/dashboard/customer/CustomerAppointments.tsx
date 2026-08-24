import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Lock, Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react';

export default function CustomerAppointments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[#F5F5F5]">
      {/* TopHeader/Title area */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-display tracking-tight text-[#F5F5F5]">My Appointments</h2>
        <p className="text-[#A1A1AA] text-sm">Manage your upcoming bookings and requests</p>
      </div>

      {/* Tabs and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2C] pb-4">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`font-medium text-[15px] pb-4 -mb-[17px] transition-colors ${activeTab === 'upcoming' ? 'text-[#E86A33] border-b-2 border-[#E86A33]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'}`}
          >
            Upcoming Appointments
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`font-medium text-[15px] pb-4 -mb-[17px] transition-colors ${activeTab === 'history' ? 'text-[#E86A33] border-b-2 border-[#E86A33]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'}`}
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
      case 'burnt-orange': return 'bg-[#E86A33]/15 text-[#E86A33] border-[#E86A33]/30';
      case 'reward-green': return 'bg-[#35B86B]/15 text-[#35B86B] border-[#35B86B]/30';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-[#1F1F1F] text-[#A1A1AA] border-[#2C2C2C]';
    }
  };

  return (
    <div className="bg-[#171717] border border-[#2C2C2C] rounded-xl p-5 flex flex-col md:flex-row gap-6 transition-colors hover:border-[#E86A33]/40 shadow-sm">
      
      {/* Column 1: Status & Time */}
      <div className="flex-1 flex flex-col gap-3">
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyles(statusColor)}`}>
            {status}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center gap-2 text-[#F5F5F5] font-medium">
            <Calendar className="w-4 h-4 text-[#E86A33]" />
            {date}
          </div>
          <div className="flex items-center gap-2 text-[#A1A1AA] text-sm">
            <Clock className="w-4 h-4 text-[#E86A33]" />
            {time}
          </div>
          <div className="flex items-center gap-2 text-[#A1A1AA] text-sm">
            <MapPin className="w-4 h-4 shrink-0 text-[#E86A33]" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Column 2: Vehicle & Package Inner Card */}
      <div className="flex-[1.5] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg text-[#F5F5F5]">{vehicle}</h3>
          <span className="font-bold text-[#F5F5F5]">{price}</span>
        </div>
        
        <div className="bg-[#101010] border border-[#2C2C2C] rounded-lg p-3 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#F5F5F5]">{packageName}</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#1F1F1F] flex items-center justify-center overflow-hidden border border-[#2C2C2C]">
                <User className="w-3 h-3 text-[#E86A33]" />
              </div>
              <span className="text-xs text-[#A1A1AA]">{staffName} • {staffStatus}</span>
            </div>
          </div>
          <button className="text-[#71717A] hover:text-[#E86A33] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Column 3: Actions & Policy */}
      <div className="flex-1 flex flex-col justify-between gap-4 border-t md:border-t-0 md:border-l border-[#2C2C2C] pt-4 md:pt-0 md:pl-6">
        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          {cancellationPolicy || "Cancellation policies apply. Review our terms for details on refunds and fees."}
        </p>
        
        <div className="flex flex-col gap-2">
          {isMissed ? (
            <Button variant="outline" fullWidth className="!text-[#F5F5F5] !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]">
              Request Refund
            </Button>
          ) : (
            <>
              <Button variant="outline" fullWidth disabled={isLocked} onClick={onReschedule} className="!text-[#F5F5F5] !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33] disabled:!border-[#2C2C2C] disabled:!text-[#71717A]">
                {isLocked && <Lock className="w-3.5 h-3.5" />}
                Reschedule
              </Button>
              <Button variant="outline" fullWidth disabled={isLocked} onClick={onCancel} className="!text-[#F5F5F5] !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33] disabled:!border-[#2C2C2C] disabled:!text-[#71717A]">
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
