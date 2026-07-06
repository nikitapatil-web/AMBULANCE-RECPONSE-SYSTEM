import React from "react";
import { MapPin, Building2, Truck, HelpCircle, HeartPulse, ShieldAlert } from "lucide-react";
import { Hospital, Ambulance, Driver, Booking } from "../types";

interface SimulationMapProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  drivers: Driver[];
  activeBooking?: Booking;
  pickupX?: number;
  pickupY?: number;
  onMapClick?: (x: number, y: number) => void;
  selectedHospitalId?: string;
  onSelectHospital?: (id: string) => void;
}

export default function SimulationMap({
  hospitals,
  ambulances,
  drivers,
  activeBooking,
  pickupX,
  pickupY,
  onMapClick,
  selectedHospitalId,
  onSelectHospital
}: SimulationMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapClick || !mapRef.current) return;
    
    // Prevent clicking on markers from triggering a re-pin unless clicked on the grid itself
    const target = e.target as HTMLElement;
    if (target.closest(".marker-element")) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    // Constrain to 0-100
    const constrainedX = Math.max(0, Math.min(100, x));
    const constrainedY = Math.max(0, Math.min(100, y));
    
    onMapClick(constrainedX, constrainedY);
  };

  // Find active ambulance coordinate
  const showActiveAmbulance = activeBooking && 
    ["accepted", "in-transit", "arrived"].includes(activeBooking.status) &&
    activeBooking.ambulanceX !== undefined &&
    activeBooking.ambulanceY !== undefined;

  return (
    <div className="relative w-full">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-100">Live Simulation Map</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Case
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded" /> Hospital
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500" /> Ambulance
          </span>
        </div>
      </div>

      {/* Map Box */}
      <div
        id="dispatch-simulation-grid"
        ref={mapRef}
        onClick={handleContainerClick}
        className="relative w-full aspect-video md:aspect-[16/10] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner cursor-crosshair select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(14, 165, 233, 0.08) 1px, transparent 1px),
            linear-gradient(rgba(30, 41, 59, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 41, 59, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px, 40px 40px, 40px 40px"
        }}
      >
        {/* City Infrastructure (Visual Aesthetics) */}
        {/* Main River */}
        <div className="absolute top-[65%] left-0 w-full h-8 bg-sky-950/20 -skew-y-3 pointer-events-none" />
        
        {/* Grid Roads */}
        <div className="absolute top-[25%] left-0 w-full h-[3px] bg-slate-800/40 pointer-events-none" />
        <div className="absolute top-[50%] left-0 w-full h-[3px] bg-slate-800/40 pointer-events-none" />
        <div className="absolute top-[75%] left-0 w-full h-[3px] bg-slate-800/40 pointer-events-none" />
        <div className="absolute left-[25%] top-0 w-[3px] h-full bg-slate-800/40 pointer-events-none" />
        <div className="absolute left-[50%] top-0 w-[3px] h-full bg-slate-800/40 pointer-events-none" />
        <div className="absolute left-[75%] top-0 w-[3px] h-full bg-slate-800/40 pointer-events-none" />

        {/* Outer Ring Road */}
        <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border border-slate-800/20 rounded-full pointer-events-none" />

        {/* Central Park Area */}
        <div className="absolute top-[55%] left-[48%] w-[12%] h-[12%] bg-emerald-950/10 border border-emerald-900/10 rounded pointer-events-none flex items-center justify-center">
          <span className="text-[9px] text-emerald-800 font-medium">City Park</span>
        </div>

        {/* 1. Hospitals Markers */}
        {hospitals.map((hospital) => {
          const isSelected = selectedHospitalId === hospital.id;
          const isActiveDestination = activeBooking && activeBooking.destinationHospitalId === hospital.id;
          
          return (
            <div
              key={hospital.id}
              onClick={() => onSelectHospital && onSelectHospital(hospital.id)}
              className="marker-element absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-300 hover:scale-110"
              style={{ left: `${hospital.x}%`, top: `${hospital.y}%` }}
              title={`${hospital.name} (Click to select)`}
            >
              <div className="relative group">
                {/* Ping animation for active emergency destination */}
                {isActiveDestination && (
                  <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping" />
                )}
                
                <div className={`p-1.5 rounded-lg border flex items-center justify-center shadow-lg transition-colors duration-200 ${
                  isActiveDestination 
                    ? "bg-rose-900/90 border-rose-500 text-rose-200 scale-105" 
                    : isSelected
                      ? "bg-sky-900 border-sky-400 text-sky-200 ring-2 ring-sky-500/50"
                      : "bg-slate-900 border-slate-700 text-sky-400"
                }`}>
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                
                {/* Mini badge for bed availability */}
                <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[7px] font-bold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {hospital.availableBeds}
                </span>

                {/* Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                  <div className="bg-slate-900 border border-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-xl whitespace-nowrap">
                    <p className="font-bold">{hospital.name}</p>
                    <p className="text-slate-400">Available Beds: {hospital.availableBeds}/{hospital.totalBeds}</p>
                    <p className="text-sky-400 text-[9px] italic mt-0.5">{hospital.specializations.join(" • ")}</p>
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-800 rotate-45 -mt-1" />
                </div>
              </div>
            </div>
          );
        })}

        {/* 2. Pickup Pin (For Booking Mode) */}
        {pickupX !== undefined && pickupY !== undefined && (
          <div
            className="marker-element absolute -translate-x-1/2 -translate-y-full z-20 pointer-events-none"
            style={{ left: `${pickupX}%`, top: `${pickupY}%` }}
          >
            <div className="flex flex-col items-center">
              <span className="absolute -inset-1 rounded-full bg-red-500/20 animate-ping" />
              <div className="bg-red-500 p-1.5 rounded-full text-white shadow-lg flex items-center justify-center ring-2 ring-white">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="mt-1 bg-red-950/90 border border-red-500 text-red-200 text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md">
                Pickup
              </div>
            </div>
          </div>
        )}

        {/* 3. Static/Idle Ambulances (Only if they aren't on active trips) */}
        {ambulances.map((amb) => {
          // If this ambulance is currently assigned to the active tracking booking, hide the static one
          const isActive = activeBooking && activeBooking.selectedAmbulanceId === amb.id && showActiveAmbulance;
          if (isActive || amb.status !== "available") return null;

          // Find driver of this ambulance to get position
          const driver = drivers.find(d => d.id === amb.driverId);
          if (!driver) return null;

          return (
            <div
              key={amb.id}
              className="marker-element absolute -translate-x-1/2 -translate-y-1/2 opacity-75 z-10 hover:opacity-100"
              style={{ left: `${driver.x}%`, top: `${driver.y}%` }}
            >
              <div className="relative group">
                <div className="p-1 rounded bg-slate-800 border border-slate-700 text-amber-500">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block pointer-events-none z-30">
                  <div className="bg-slate-900 text-slate-100 text-[8px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    AMB: {amb.plateNumber} ({amb.type})
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 4. Active Dispatched Ambulance Tracker */}
        {showActiveAmbulance && (
          <div
            className="marker-element absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-1000 ease-out"
            style={{ left: `${activeBooking.ambulanceX}%`, top: `${activeBooking.ambulanceY}%` }}
          >
            <div className="relative flex flex-col items-center group">
              {/* Radial shockwave pulse based on severity */}
              <span className={`absolute -inset-3 rounded-full animate-ping ${
                activeBooking.severity === "Critical" ? "bg-red-500/30" : "bg-amber-500/30"
              }`} />
              
              <div className={`p-2 rounded-xl border flex items-center justify-center shadow-xl animate-bounce ${
                activeBooking.severity === "Critical" 
                  ? "bg-red-600 border-red-400 text-white" 
                  : "bg-amber-500 border-amber-300 text-slate-950"
              }`}>
                {activeBooking.severity === "Critical" ? (
                  <HeartPulse className="w-5 h-5 animate-pulse" />
                ) : (
                  <Truck className="w-5 h-5" />
                )}
              </div>

              {/* Status Info Badge */}
              <div className="mt-1 flex flex-col items-center">
                <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md uppercase tracking-wider text-center ${
                  activeBooking.status === "arrived"
                    ? "bg-emerald-500 text-slate-950"
                    : activeBooking.status === "in-transit"
                      ? "bg-sky-500 text-slate-950 animate-pulse"
                      : "bg-amber-400 text-slate-950"
                }`}>
                  {activeBooking.status === "accepted" ? "En-Route" : activeBooking.status}
                </div>
                {activeBooking.estimatedArrivalMinutes > 0 && (
                  <div className="text-[9px] font-semibold text-white drop-shadow-md bg-slate-950/80 px-1 py-0.5 rounded mt-0.5">
                    ETA: {activeBooking.estimatedArrivalMinutes} min
                  </div>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block pointer-events-none z-30">
                <div className="bg-slate-900 border border-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-xl whitespace-nowrap">
                  <p className="font-bold flex items-center gap-1 text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" /> Dispatched Emergency Vehicle
                  </p>
                  <p className="text-slate-400 mt-0.5">Patient: {activeBooking.patientName}</p>
                  <p className="text-slate-400">Symptoms: {activeBooking.symptoms.substring(0, 30)}...</p>
                </div>
                <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-800 rotate-45 -mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Route Path (Visual Vector Overlay between Ambulance, Pickup, and Hospital) */}
        {activeBooking && showActiveAmbulance && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
            {/* Draw road line from ambulance start/current to pickup, and then to hospital */}
            <polyline
              points={`
                ${activeBooking.ambulanceX}%,${activeBooking.ambulanceY}%
                ${activeBooking.pickupLocation.x}%,${activeBooking.pickupLocation.y}%
                ${(() => {
                  const h = hospitals.find(hosp => hosp.id === activeBooking.destinationHospitalId);
                  return h ? `${h.x}%,${h.y}%` : "50%,50%";
                })()}
              `}
              fill="none"
              stroke={activeBooking.severity === "Critical" ? "#f43f5e" : "#f59e0b"}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="animate-[dash_2s_linear_infinite]"
              style={{
                strokeDashoffset: 0
              }}
            />
          </svg>
        )}

        {/* Instructions overlay for patient booking */}
        {!activeBooking && onMapClick && (
          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-400 pointer-events-none">
            <span className="text-sky-400 font-semibold">Tip:</span> Click anywhere on the grid map to select your pickup location coordinate.
          </div>
        )}
      </div>
    </div>
  );
}
