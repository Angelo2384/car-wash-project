import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Calendar, Clock, Car, FileText, Hash, ArrowLeft } from 'lucide-react';

export default function CustomerReschedule() {
  const navigate = useNavigate();
  const [date, setDate] = useState('2023-10-25');
  const [time, setTime] = useState('10:00');
  
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
        <h2 className="text-2xl font-bold font-display tracking-tight text-[#F5F5F5]">Reschedule Appointment</h2>
        <p className="text-[#A1A1AA] text-sm">Details of the new booking</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column (Form) */}
        <div className="flex-[2] flex flex-col gap-6 bg-[#171717] border border-[#2C2C2C] rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Date & Time</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                type="date"
                label="Select Date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                icon={<Calendar className="w-5 h-5" />} 
                className="!bg-[#101010] !border-[#2C2C2C] !text-[#F5F5F5] focus:!border-[#E86A33] focus:!ring-[#E86A33] [color-scheme:dark]"
                labelClassName="!text-[#A1A1AA]"
                iconClassName="!text-[#E86A33]"
              />
              <Input 
                type="time"
                label="Select Time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                icon={<Clock className="w-5 h-5" />} 
                className="!bg-[#101010] !border-[#2C2C2C] !text-[#F5F5F5] focus:!border-[#E86A33] focus:!ring-[#E86A33] [color-scheme:dark]"
                labelClassName="!text-[#A1A1AA]"
                iconClassName="!text-[#E86A33]"
              />
            </div>
          </div>

          <div className="h-px bg-[#2C2C2C] my-2" />

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Vehicle Details</h3>
            <Input 
              label="Licence Plate" 
              defaultValue="XYZ 1234"
              icon={<Hash className="w-5 h-5" />} 
              className="!bg-[#101010] !border-[#2C2C2C] !text-[#F5F5F5] focus:!border-[#E86A33] focus:!ring-[#E86A33]"
              labelClassName="!text-[#A1A1AA]"
              iconClassName="!text-[#E86A33]"
            />
            <Input 
              label="Vehicle Make & Model" 
              defaultValue="Ford F-150"
              icon={<Car className="w-5 h-5" />} 
              className="!bg-[#101010] !border-[#2C2C2C] !text-[#F5F5F5] focus:!border-[#E86A33] focus:!ring-[#E86A33]"
              labelClassName="!text-[#A1A1AA]"
              iconClassName="!text-[#E86A33]"
            />
            <Input 
              label="Reason for reschedule (Optional)" 
              placeholder="e.g. Schedule conflict"
              icon={<FileText className="w-5 h-5" />} 
              className="!bg-[#101010] !border-[#2C2C2C] !text-[#F5F5F5] placeholder:!text-[#71717A] focus:!border-[#E86A33] focus:!ring-[#E86A33]"
              labelClassName="!text-[#A1A1AA]"
              iconClassName="!text-[#E86A33]"
            />
          </div>
        </div>

        {/* Right Column (Summary) */}
        <div className="flex-1">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-xl p-6 flex flex-col gap-5 sticky top-24 shadow-sm">
            <h3 className="text-lg font-semibold text-[#F5F5F5]">New booking summary</h3>
            
            <div className="flex flex-col gap-1">
              <span className="text-[#A1A1AA] text-sm">Package Selected</span>
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium text-[#F5F5F5]">Exterior & Interior Deep Clean</span>
                <span className="font-semibold text-[#F5F5F5]">R150.00</span>
              </div>
              <span className="text-[#71717A] text-sm mt-1">Duration: ~1.5 hours</span>
            </div>

            <div className="h-px bg-[#2C2C2C]" />

            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA] text-sm">Date</span>
                <span className="font-medium text-[#F5F5F5]">{date || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A1A1AA] text-sm">Time</span>
                <span className="font-medium text-[#F5F5F5]">{time || 'Not selected'}</span>
              </div>
            </div>

            <div className="h-px bg-[#2C2C2C]" />

            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA] text-sm">Subtotal</span>
                <span className="font-medium text-[#F5F5F5]">R150.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A1A1AA] text-sm">VAT (15%)</span>
                <span className="font-medium text-[#F5F5F5]">R22.50</span>
              </div>
              <div className="flex justify-between mt-2 pt-3 border-t border-[#2C2C2C]">
                <span className="font-bold text-[#F5F5F5]">Total</span>
                <span className="font-bold text-[#E86A33] text-lg">R172.50</span>
              </div>
            </div>

            <Button variant="outline" fullWidth className="mt-4 !border-[#E86A33] !text-[#E86A33] hover:!bg-[#E86A33]/10 hover:!border-[#E86A33]">
              Reschedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
