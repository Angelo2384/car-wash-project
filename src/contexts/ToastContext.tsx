import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean; id: number }>({
    message: '',
    type: 'info',
    isVisible: false,
    id: 0,
  });

  const showToast = (message: string, type: ToastType) => {
    // Generate a new ID each time to ensure the useEffect timer resets even if the message is the same
    setToast({ message, type, isVisible: true, id: Date.now() });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible, toast.id]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Global Toast Component */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${
          toast.isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-10 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl max-w-md w-[90vw] md:w-auto backdrop-blur-sm bg-charcoal-900/90 ${
          toast.type === 'error' ? 'border-red-500/50' : 
          toast.type === 'success' ? 'border-reward-green/50' : 
          'border-burnt-orange/50'
        }`}>
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-reward-green-light" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-burnt-orange" />}
          </div>
          
          <div className={`flex-1 text-sm font-medium leading-relaxed ${
            toast.type === 'error' ? 'text-red-400' : 
            toast.type === 'success' ? 'text-reward-green-light' : 
            'text-white'
          }`}>
            {toast.message}
          </div>

          <button 
            onClick={hideToast}
            className={`shrink-0 p-1 rounded-md transition-colors ${
              toast.type === 'error' ? 'hover:bg-red-500/20 text-red-500/80 hover:text-red-500' : 
              toast.type === 'success' ? 'hover:bg-reward-green/20 text-reward-green-light/80 hover:text-reward-green-light' : 
              'hover:bg-burnt-orange/20 text-burnt-orange/80 hover:text-burnt-orange'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
