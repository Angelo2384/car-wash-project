import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export default function TempSignIn() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold font-display tracking-tight mb-3 text-white">Temporary Router</h1>
        <p className="text-soft-gray text-sm">Choose a dashboard to test the routing.</p>
      </div>
      <div className="space-y-4">
        <Button onClick={() => navigate('/dashboard/customer')} fullWidth>
          Customer Dashboard
        </Button>
        <Button onClick={() => navigate('/dashboard/staff')} fullWidth>
          Staff Dashboard
        </Button>
        <Button onClick={() => navigate('/dashboard/admin')} fullWidth>
          Admin Dashboard
        </Button>
      </div>
    </div>
  );
}
