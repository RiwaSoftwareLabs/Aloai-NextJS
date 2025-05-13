"use client";

import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPortal } from 'react-dom';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-gray-500/30 z-[100] flex items-center justify-center modal-backdrop"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Modal content */}
      <div 
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-11/12 mx-auto modal-content border border-gray-100"
        onClick={e => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-lg text-gray-800">{t('logout.title')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-7">{t('logout.message')}</p>
        
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} gap-4`}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            {t('logout.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 transition-colors text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            {t('logout.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutModal; 