import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export interface PaymentSuccessInfo {
  itemName: string;
  amount: string;
  paymentType: 'membership' | 'package' | 'appointment';
  appointmentDate?: string;
  appointmentTime?: string;
  reference?: string;
}

interface PaymentSuccessModalProps {
  open: boolean;
  paymentInfo: PaymentSuccessInfo | null;
  onDone: () => void;
  doneText?: string;
}

export default function PaymentSuccessModal({
  open,
  paymentInfo,
  onDone,
  doneText = "Done"
}: PaymentSuccessModalProps) {
  if (!open || !paymentInfo) return null;

  const { itemName, amount, paymentType, appointmentDate, appointmentTime, reference } = paymentInfo;

  // Build the dynamic message
  let messageContent: React.ReactNode;
  if (paymentType === 'appointment' && appointmentDate) {
    messageContent = (
      <>
        Your payment of <strong className="text-[#F5F5F5]">{amount}</strong> for your{' '}
        <strong className="text-[#F5F5F5]">{itemName}</strong> appointment
        {appointmentDate && <> on {appointmentDate}</>}
        {appointmentTime && <> at {appointmentTime}</>}
        {' '}was successful.
      </>
    );
  } else if (paymentType === 'membership') {
    messageContent = (
      <>
        Your payment of <strong className="text-[#F5F5F5]">{amount}</strong> for the{' '}
        <strong className="text-[#F5F5F5]">{itemName}</strong> was successful.
      </>
    );
  } else {
    messageContent = (
      <>
        Your payment of <strong className="text-[#F5F5F5]">{amount}</strong> for the{' '}
        <strong className="text-[#F5F5F5]">{itemName}</strong> was successful.
      </>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #2C2C2C',
          borderRadius: '1rem',
          maxWidth: '28rem',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(to right, #E86A33, #35B86B, #E86A33)',
          }}
        />

        {/* Checkmark Icon */}
        <div
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(53, 184, 107, 0.15)',
            border: '1px solid rgba(53, 184, 107, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 10px 15px -3px rgba(53, 184, 107, 0.1)',
          }}
        >
          <CheckCircle2 style={{ width: '2rem', height: '2rem', color: '#35B86B' }} />
        </div>

        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            color: '#F5F5F5',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Payment Successful!
        </h3>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#D4D4D4',
            marginTop: '0.75rem',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          {messageContent}
        </p>

        {/* Details Box */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#101010',
            border: '1px solid #2C2C2C',
            borderRadius: '0.75rem',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #2C2C2C' }}>
            <span style={{ fontSize: '0.75rem', color: '#71717A' }}>Amount Paid</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#35B86B' }}>{amount}</span>
          </div>
          {reference && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', paddingTop: '0.25rem' }}>
              <span style={{ color: '#71717A' }}>Reference</span>
              <span style={{ fontWeight: 500, color: '#F5F5F5' }}>{reference}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={onDone}
          className="py-3.5 text-sm font-semibold"
        >
          {doneText}
        </Button>
      </div>
    </div>
  );
}
