import { Navigate, useLocation } from 'react-router-dom';

/**
 * Payment happens straight from the booking page now (Paystack opens there), so the old
 * checkout step just forwards any links or bookmarks to it.
 */
export default function CustomerCheckout() {
  const location = useLocation();
  return <Navigate to="/dashboard/customer/booking" replace state={location.state} />;
}
