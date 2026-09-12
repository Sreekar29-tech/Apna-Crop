'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Building,
  AlertCircle,
  Truck,
  FileCheck,
  Scale,
  Microscope,
  CheckCheck,
  Banknote
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/calculations';

interface QueueTrackerViewProps {
  booking: Booking | null;
  onNavigate: (tabId: string) => void;
  t: Record<string, string>;
}

const STAGE_ICONS = [
  FileCheck, // Booked
  Truck,     // Arrived
  FileCheck, // Verification
  Scale,     // Weighing
  Microscope,// Quality Check
  CheckCheck,// Final Acceptance
  Banknote   // Completed
];

const STAGE_DESCRIPTIONS = [
  'Procurement slot reserved. Token pass issued.',
  'Vehicle entered APMC mandi gate #2.',
  'Farmer identity and land parcel records verified.',
  'Vehicle gross weighment calibrated on electronic weighbridge.',
  'Grain Fair Average Quality (FAQ) & moisture analysis.',
  'Net grain weight accepted and unloaded in government silo.',
  'DBT transaction successfully disbursed to bank account.'
];

export const QueueTrackerView: React.FC<QueueTrackerViewProps> = ({ booking, onNavigate, t }) => {
  if (!booking) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No Booking Active to Track</h3>
        <p className="text-xs text-gray-500">
          Select an active slot booking to view its live 7-stage procurement progress through the APMC Mandi.
        </p>
        <button
          onClick={() => onNavigate('book-slot')}
          className="px-4 py-2 bg-[#16823b] text-white rounded-xl text-xs font-semibold hover:bg-[#0f5c29] transition-colors cursor-pointer"
        >
          Book a Mandi Slot
        </button>
      </div>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.indexOf(booking.status as any);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {t.queueHeading || 'Live Queue & Pipeline Tracker'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t.queueSub ||
            'Real-time status updates as your crop moves from arrival to final acceptance.'}
        </p>
      </div>

      {/* Overview Status Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{booking.token_number}</span>
            <span className={`badge badge-${booking.status.toLowerCase().replace(/\s+/g, '')}`}>
              {booking.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {booking.crop_name} &bull; {booking.quantity_quintals} Quintals &bull; {booking.centre_name}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-gray-400 font-semibold uppercase">Queue Position</div>
            <div className="text-xl font-bold text-[#16823b]">#{booking.queue_number || 1}</div>
          </div>
          <div className="text-right border-l pl-4 border-gray-200">
            <div className="text-[11px] text-gray-400 font-semibold uppercase">Estimated Wait</div>
            <div className="text-xl font-bold text-gray-800">{booking.estimated_wait_minutes || 20} min</div>
          </div>
        </div>
      </div>

      {/* 7-Stage Visual Stepper Pipeline */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>7-Stage APMC Mandi Procurement Lifecycle</span>
          <span className="text-xs font-normal text-gray-400">
            (Stage {activeIndex + 1} of 7)
          </span>
        </h3>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 hidden md:block" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-[#16823b] hidden md:block transition-all duration-500"
            style={{ width: `${(activeIndex / (PIPELINE_STAGES.length - 1)) * 90}%` }}
          />

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 relative z-10">
            {PIPELINE_STAGES.map((stage, idx) => {
              const Icon = STAGE_ICONS[idx] || CheckCircle2;
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div key={stage} className="flex md:flex-col items-center md:items-center gap-3 md:gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isPast
                        ? 'bg-[#16823b] text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <div className="text-left md:text-center">
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCurrent ? 'text-amber-700' : isPast ? 'text-[#16823b]' : 'text-gray-400'
                      }`}
                    >
                      {stage}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 hidden lg:block leading-snug">
                      {STAGE_DESCRIPTIONS[idx]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Current Stage Status Box */}
        <div className="mt-8 p-4 rounded-xl bg-[#e9f7ee] border border-[#86efac] flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#16823b] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#123b25]">
              Current Mandi Action: {booking.status}
            </div>
            <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
              {STAGE_DESCRIPTIONS[activeIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
