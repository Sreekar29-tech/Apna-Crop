'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center py-4 px-6 text-xs text-gray-500 border-t border-gray-200 bg-white mt-auto no-print">
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
        <span>&copy; 2026 Apna Crop. All rights reserved.</span>
        <span className="text-[11px] text-gray-400">
          Smart India Hackathon • Ministry of Agriculture & Farmers Welfare
        </span>
      </div>
    </footer>
  );
};
