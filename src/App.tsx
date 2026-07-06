import React, { useState, useEffect } from "react";
import {
  Activity,
  User as UserIcon,
  ShieldAlert,
  Clock,
  MapPin,
  Phone,
  Truck,
  Building2,
  FileText,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  HeartPulse,
  Brain,
  Download,
  PlusCircle,
  HelpCircle,
  LogOut,
  RefreshCw,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Hospital, Ambulance, Driver, Booking, EmergencyContact, DashboardStats } from "./types";
import SimulationMap from "./components/SimulationMap";

export default function App() {
  // -------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState("patient@gmail.com");
  const [loginRole, setLoginRole] = useState<"patient" | "driver" | "hospital" | "admin">("patient");

  // Registration State (Patient)
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Db State
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Patient Booking Flow State
  const [symptoms, setSymptoms] = useState("");
  const [pickupAddress, setPickupAddress] = useState("128 Oakridge Ave");
  const [pickupX, setPickupX] = useState<number>(60);
  const [pickupY, setPickupY] = useState<number>(45);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  
  // AI triage results state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"book" | "history" | "contacts">("book");

  // Emergency contact creation
  const [newContactName, setNewContactName] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  // Admin CRUD Add forms states
  const [adminTab, setAdminTab] = useState<"dashboard" | "bookings" | "ambulances" | "hospitals" | "drivers">("dashboard");
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddAmbulance, setShowAddAmbulance] = useState(false);

  // Form states for Admin CRUD Add
  const [hospName, setHospName] = useState("");
  const [hospPhone, setHospPhone] = useState("");
  const [hospBeds, setHospBeds] = useState(50);
  const [hospX, setHospX] = useState(50);
  const [hospY, setHospY] = useState(50);
  const [hospSpec, setHospSpec] = useState("General Emergency");

  const [ambPlate, setAmbPlate] = useState("");
  const [ambType, setAmbType] = useState<"BLS" | "ALS" | "ICU" | "Patient Transport">("BLS");
  const [ambDriverId, setAmbDriverId] = useState("");
  const [ambHospId, setAmbHospId] = useState("");

  // Active tracking booking state reference
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);

  // Report Modal state
  const [reportBooking, setReportBooking] = useState<Booking | null>(null);
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);
  const [fbRating, setFbRating] = useState(5);
  const [fbComments, setFbComments] = useState("");

  // Global loading
  const [globalLoading, setGlobalLoading] = useState(false);

  // -------------------------------------------------------------
  // DATA FETCHING & SYNC
  // -------------------------------------------------------------
  const fetchData = async () => {
    try {
      const [hospRes, ambRes, drvRes, bkRes, statsRes] = await Promise.all([
        fetch("/api/hospitals").then(r => r.json()),
        fetch("/api/ambulances").then(r => r.json()),
        fetch("/api/drivers").then(r => r.json()),
        fetch("/api/bookings").then(r => r.json()),
        fetch("/api/dashboard/stats").then(r => r.json())
      ]);

      setHospitals(hospRes);
      setAmbulances(ambRes);
      setDrivers(drvRes);
      setBookings(bkRes);
      setStats(statsRes);

      // Extract current tracking booking if exists
      if (currentUser) {
        if (currentUser.role === "patient") {
          const active = bkRes.find((b: Booking) => b.patientId === currentUser.id && ["pending", "accepted", "in-transit", "arrived"].includes(b.status));
          setTrackingBooking(active || null);
        } else if (currentUser.role === "driver") {
          const active = bkRes.find((b: Booking) => b.selectedDriverId === currentUser.driverId && ["pending", "accepted", "in-transit", "arrived"].includes(b.status));
          setTrackingBooking(active || null);
        } else if (currentUser.role === "hospital") {
          const active = bkRes.find((b: Booking) => b.destinationHospitalId === currentUser.hospitalId && ["pending", "accepted", "in-transit", "arrived"].includes(b.status));
          setTrackingBooking(active || null);
        }
      }
    } catch (err) {
      console.error("Error synchronizing application database:", err);
    }
  };

  const fetchContacts = async (userId: string) => {
    try {
      const res = await fetch(`/api/emergency-contacts?patientId=${userId}`);
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // GPS Tracking Simulation Polling loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Check if there is an active tracking booking in motion states
    if (trackingBooking && ["accepted", "in-transit", "arrived"].includes(trackingBooking.status)) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/bookings/${trackingBooking.id}/simulate-gps`, {
            method: "POST"
          });
          const data = await res.json();
          if (data.success) {
            setTrackingBooking(data.booking);
            // Refresh main booking list in background
            const bkListRes = await fetch("/api/bookings");
            const bkListData = await bkListRes.json();
            setBookings(bkListData);
          }
        } catch (err) {
          console.error("Error during GPS path simulation polling:", err);
        }
      }, 2500); // Poll every 2.5s for coordinate movement
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [trackingBooking]);

  // Quick refresh button
  const handleManualSync = async () => {
    setGlobalLoading(true);
    await fetchData();
    if (currentUser && currentUser.role === "patient") {
      await fetchContacts(currentUser.id);
    }
    setGlobalLoading(false);
  };

  // -------------------------------------------------------------
  // AUTHENTICATION FLOW
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, role: loginRole })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        if (data.user.role === "patient") {
          fetchContacts(data.user.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail) return;
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          role: "patient"
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsRegistering(false);
        fetchContacts(data.user.id);
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTrackingBooking(null);
    setAiResults(null);
    setSymptoms("");
    setPickupX(60);
    setPickupY(45);
  };

  // -------------------------------------------------------------
  // PATIENT EMERGENCY ACTION HANDLERS
  // -------------------------------------------------------------
  const handleMapClick = (x: number, y: number) => {
    setPickupX(x);
    setPickupY(y);
    setPickupAddress(`Grid Coord Location (${x}, ${y})`);
    // Clear AI recommendation if coordinates shift, encouraging fresh analysis
    if (aiResults) {
      setAiResults(null);
    }
  };

  const triggerAITriage = async () => {
    if (!symptoms.trim()) {
      alert("Please describe the patient's symptoms first to run the AI Emergency Analyzer.");
      return;
    }
    setAiLoading(true);
    setAiResults(null);

    try {
      const res = await fetch("/api/ai/analyze-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          pickupLocation: { name: pickupAddress, x: pickupX, y: pickupY }
        })
      });
      const data = await res.json();
      setAiResults(data.aiAnalysis);
      setSelectedHospitalId(data.aiAnalysis.recommendedHospitalId);
    } catch (err) {
      console.error(err);
      alert("Error calling AI Triage Server. Standard dispatcher routing will be engaged.");
    } finally {
      setAiLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!currentUser) return;
    if (!symptoms.trim()) {
      alert("Please describe symptoms before booking.");
      return;
    }

    setGlobalLoading(true);
    try {
      // Use AI recommendations or fall back to defaults
      const payload = {
        patientId: currentUser.id,
        patientName: currentUser.name,
        patientPhone: currentUser.phone || "+1 (555) 999-0000",
        symptoms,
        severity: aiResults?.severity || "Moderate",
        pickupLocation: { name: pickupAddress, x: pickupX, y: pickupY },
        destinationHospitalId: selectedHospitalId || hospitals[0]?.id || "hosp_1",
        selectedAmbulanceId: aiResults?.recommendedAmbulanceId || ambulances[0]?.id || "amb_1",
        selectedDriverId: aiResults?.recommendedDriverId || drivers[0]?.id || "drv_1",
        estimatedArrivalMinutes: aiResults?.estimatedArrivalMinutes || 10,
        aiAnalysis: aiResults ? {
          severity: aiResults.severity,
          recommendedAmbulanceType: aiResults.recommendedAmbulanceType,
          suggestedHospitalSpecialization: aiResults.suggestedHospitalSpecialization,
          explanation: aiResults.explanation,
          firstAidInstructions: aiResults.firstAidInstructions,
          etaReasoning: aiResults.etaReasoning
        } : undefined
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setTrackingBooking(data.booking);
        setSymptoms("");
        setAiResults(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this emergency request?")) return;
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      const data = await res.json();
      if (data.success) {
        setTrackingBooking(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Feedback Submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackBooking) return;
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/bookings/${feedbackBooking.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: fbRating, comments: fbComments })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackBooking(null);
        setFbComments("");
        setFbRating(5);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Emergency Contacts
  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newContactName || !newContactPhone) return;
    try {
      const res = await fetch("/api/emergency-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          name: newContactName,
          relationship: newContactRelation,
          phone: newContactPhone
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewContactName("");
        setNewContactRelation("");
        setNewContactPhone("");
        fetchContacts(currentUser.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/emergency-contacts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success && currentUser) {
        fetchContacts(currentUser.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // DRIVER EMERGENCY ACTION HANDLERS
  // -------------------------------------------------------------
  const updateBookingStatusByDriver = async (bookingId: string, nextStatus: string) => {
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setTrackingBooking(data.booking);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const toggleDriverAvailability = async (driverId: string, currentAvail: boolean) => {
    try {
      await fetch(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !currentAvail })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // HOSPITAL STAFF CONTROL HANDLERS
  // -------------------------------------------------------------
  const updateHospitalBeds = async (hospId: string, available: number, total: number) => {
    try {
      await fetch(`/api/hospitals/${hospId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableBeds: available, totalBeds: total })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // ADMIN CRUD HANDLERS
  // -------------------------------------------------------------
  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName) return;
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hospName,
          specializations: hospSpec.split(",").map(s => s.trim()),
          x: hospX,
          y: hospY,
          phone: hospPhone,
          totalBeds: hospBeds
        })
      });
      const data = await res.json();
      if (data.success) {
        setHospName("");
        setHospPhone("");
        setShowAddHospital(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleAddAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambPlate) return;
    setGlobalLoading(true);
    try {
      const res = await fetch("/api/ambulances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: ambPlate,
          type: ambType,
          driverId: ambDriverId,
          hospitalId: ambHospId,
          fuelLevel: 100
        })
      });
      const data = await res.json();
      if (data.success) {
        setAmbPlate("");
        setAmbDriverId("");
        setAmbHospId("");
        setShowAddAmbulance(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  // -------------------------------------------------------------
  // PRINT/PDF REPORT DESIGN COMPONENT
  // -------------------------------------------------------------
  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* GLOBAL LOADING INDICATOR BAR */}
      <AnimatePresence>
        {globalLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-sky-500 to-red-600 z-50 animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* TOP HEADER / BAR AREA */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <Activity className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-100 flex items-center gap-2">
                RESCUE LINK <span className="text-[10px] bg-red-950 border border-red-800 text-red-400 font-bold px-1.5 py-0.5 rounded uppercase">AI Response</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">Ambulance Booking & Response System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* MANUAL REFRESH DATABASE BUTTON */}
            <button
              onClick={handleManualSync}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
              title="Sync Live Simulation Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* QUICK-SWITCHER BAR FOR TESTING PREVIEW */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-slate-300 max-w-[100px] truncate">{currentUser.name}</span>
                <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {currentUser.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="ml-1 text-slate-500 hover:text-red-400 transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        
        {/* LOGIN AND REGISTRATION BOARD */}
        {!currentUser && (
          <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Design accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-sky-500" />
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-red-950 text-red-500 rounded-2xl border border-red-900/40 mb-3">
                <HeartPulse className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Access Control Center</h2>
              <p className="text-xs text-slate-400 mt-1">Select a simulated user role to explore entire system perspectives.</p>
            </div>

            {/* Selector tabs for demonstration */}
            <div className="grid grid-cols-4 gap-1.5 mb-6 bg-slate-950 border border-slate-800/80 p-1.5 rounded-xl text-[11px]">
              {(["patient", "driver", "hospital", "admin"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setLoginRole(role);
                    if (role === "patient") setLoginEmail("patient@gmail.com");
                    if (role === "driver") setLoginEmail("driver1@ambulance.org");
                    if (role === "hospital") setLoginEmail("staff@citycentral.org");
                    if (role === "admin") setLoginEmail("admin@emergency.org");
                  }}
                  className={`py-1.5 rounded-lg text-center font-semibold capitalize transition ${
                    loginRole === role
                      ? "bg-slate-800 text-slate-100 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {!isRegistering ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/10 transition flex items-center justify-center gap-2"
                >
                  Enter Command Center <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-3 border-t border-slate-800/60">
                  <p className="text-xs text-slate-500">
                    Need a Patient account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsRegistering(true)}
                      className="text-sky-400 font-semibold hover:underline"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-2.5 rounded-xl transition text-sm text-slate-300"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold py-2.5 rounded-xl shadow-lg transition text-sm text-white"
                  >
                    Register Patient
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            PATIENT ROLE INTERFACE
            ------------------------------------------------------------- */}
        {currentUser && currentUser.role === "patient" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Tabs Selector */}
            <div className="lg:col-span-12 flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("book")}
                  className={`pb-2.5 font-bold text-sm tracking-tight border-b-2 transition ${
                    activeTab === "book" ? "border-red-500 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Ambulance Dispatch AI
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`pb-2.5 font-bold text-sm tracking-tight border-b-2 transition ${
                    activeTab === "history" ? "border-red-500 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Booking History
                </button>
                <button
                  onClick={() => setActiveTab("contacts")}
                  className={`pb-2.5 font-bold text-sm tracking-tight border-b-2 transition ${
                    activeTab === "contacts" ? "border-red-500 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Emergency Contacts
                </button>
              </div>

              {trackingBooking && (
                <div className="flex items-center gap-2 bg-rose-950 border border-rose-800/60 text-rose-300 px-3 py-1 rounded-xl text-xs animate-pulse font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Emergency Dispatch Active
                </div>
              )}
            </div>

            {/* TAB: DISPATCH FLOW */}
            {activeTab === "book" && (
              <>
                {/* Left Side Column: Map & Triage results */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Simulation Map Component */}
                  <SimulationMap
                    hospitals={hospitals}
                    ambulances={ambulances}
                    drivers={drivers}
                    activeBooking={trackingBooking || undefined}
                    pickupX={trackingBooking ? undefined : pickupX}
                    pickupY={trackingBooking ? undefined : pickupY}
                    onMapClick={trackingBooking ? undefined : handleMapClick}
                    selectedHospitalId={selectedHospitalId}
                    onSelectHospital={(id) => !trackingBooking && setSelectedHospitalId(id)}
                  />

                  {/* Active Tracking Details Component (Visible when booking exists) */}
                  {trackingBooking && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-rose-600" />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-amber-950 text-amber-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-amber-800">
                              Booking {trackingBooking.id}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(trackingBooking.bookingTime).toLocaleTimeString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold mt-1.5 flex items-center gap-1.5">
                            Ambulance Dispatched
                          </h3>
                        </div>

                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-950 border border-slate-800 text-amber-400 animate-pulse capitalize">
                          {trackingBooking.status}
                        </span>
                      </div>

                      {/* Timeline status track */}
                      <div className="grid grid-cols-4 gap-2 mb-6 text-center text-[10px] font-bold">
                        {[
                          { key: "pending", label: "Requested" },
                          { key: "accepted", label: "Accepted" },
                          { key: "in-transit", label: "In Transit" },
                          { key: "arrived", label: "Arrived" }
                        ].map((step, idx) => {
                          const statuses = ["pending", "accepted", "in-transit", "arrived", "completed"];
                          const curIdx = statuses.indexOf(trackingBooking.status);
                          const stepIdx = statuses.indexOf(step.key);
                          const isDone = curIdx >= stepIdx;
                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center mb-1 ${
                                isDone ? "bg-red-600 border-red-500 text-white" : "bg-slate-950 border-slate-800 text-slate-600"
                              }`}>
                                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                              <span className={isDone ? "text-slate-200" : "text-slate-500"}>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/60 mb-4 text-xs">
                        <div>
                          <p className="text-slate-400 mb-1">Ambulance Assigned:</p>
                          <div className="flex items-center gap-2 text-slate-200 font-semibold font-mono">
                            <Truck className="w-4 h-4 text-amber-500" />
                            {ambulances.find(a => a.id === trackingBooking.selectedAmbulanceId)?.plateNumber || trackingBooking.selectedAmbulanceId}
                            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              {ambulances.find(a => a.id === trackingBooking.selectedAmbulanceId)?.type}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-slate-400 mb-1">Assigned EMT Specialist:</p>
                          <div className="flex items-center gap-2 text-slate-200 font-semibold">
                            <UserIcon className="w-4 h-4 text-sky-400" />
                            {drivers.find(d => d.id === trackingBooking.selectedDriverId)?.name || trackingBooking.selectedDriverId}
                            <span className="text-amber-400 flex items-center gap-0.5 text-[10px]">
                              ★ {drivers.find(d => d.id === trackingBooking.selectedDriverId)?.rating || "4.8"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {trackingBooking.aiAnalysis && (
                        <div className="bg-sky-950/20 border border-sky-900/40 rounded-xl p-4 mb-4 text-xs">
                          <h4 className="font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
                            <Brain className="w-4 h-4" /> Real-time Clinical Response Instructions
                          </h4>
                          <div className="text-slate-300 space-y-1">
                            {trackingBooking.aiAnalysis.firstAidInstructions.split("\n").map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {trackingBooking.status !== "arrived" && trackingBooking.status !== "in-transit" ? (
                          <button
                            onClick={() => handleCancelBooking(trackingBooking.id)}
                            className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 font-semibold py-2.5 rounded-xl text-xs text-rose-400 transition"
                          >
                            Cancel Dispatch
                          </button>
                        ) : null}
                        
                        <a
                          href={`tel:${hospitals.find(h => h.id === trackingBooking.destinationHospitalId)?.phone || "911"}`}
                          className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Hospital Dispatcher
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side Column: Input symptoms & AI analysis display */}
                <div className="lg:col-span-5">
                  {!trackingBooking ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-300">Symptoms & Clinical Condition</label>
                          <span className="text-[10px] text-red-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                            ● AI Triage Ready
                          </span>
                        </div>
                        <textarea
                          placeholder="Please describe the emergency symptoms. Example: 'Crushing chest pain and left arm numbness' or 'Fell off ladder and suspected leg fracture.'"
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Pickup Address</label>
                          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 text-slate-300 font-mono">
                            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="truncate">{pickupAddress}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider font-bold text-sky-400">Target Clinic / Center</label>
                          <select
                            value={selectedHospitalId}
                            onChange={(e) => setSelectedHospitalId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-sky-500 font-sans"
                          >
                            <option value="">Select Hospital Center</option>
                            {hospitals.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={triggerAITriage}
                          disabled={aiLoading}
                          className="flex-1 bg-gradient-to-r from-red-600 to-sky-600 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2 border border-slate-800"
                        >
                          {aiLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Analyzing Symptoms...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 text-white" />
                              Analyze Symptoms with Emergency AI
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display AI triage results */}
                      <AnimatePresence>
                        {aiResults && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-xs space-y-3 relative overflow-hidden"
                          >
                            {/* Accent Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-sky-400" /> Triage Decision Support
                              </h4>
                              
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                aiResults.severity === "Critical"
                                  ? "bg-red-950 border-red-800 text-red-400 animate-pulse"
                                  : aiResults.severity === "High"
                                    ? "bg-rose-950 border-rose-900 text-rose-400"
                                    : "bg-amber-950 border-amber-900 text-amber-400"
                              }`}>
                                {aiResults.severity} Priority
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Suggested Ambulance</p>
                                <p className="font-bold text-slate-200 mt-0.5">{aiResults.recommendedAmbulanceType}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Arrival ETA</p>
                                <p className="font-bold text-sky-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> ~ {aiResults.estimatedArrivalMinutes} Minutes
                                </p>
                              </div>
                            </div>

                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                              <p className="font-bold text-slate-200 mb-0.5">Clinical Indication:</p>
                              {aiResults.explanation}
                            </div>

                            <div className="bg-red-950/20 p-2.5 rounded border border-red-900/20 text-[11px]">
                              <p className="font-bold text-red-400 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pre-Arrival First Aid Guidance:
                              </p>
                              <div className="text-slate-300 space-y-1 whitespace-pre-line">
                                {aiResults.firstAidInstructions}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={confirmBooking}
                              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/15 border border-red-500"
                            >
                              Dispatch Recommended Ambulance Now <ArrowRight className="w-4 h-4" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg text-center space-y-4">
                      <div className="p-3 bg-red-950 text-red-400 rounded-full inline-flex border border-red-900/30 animate-pulse">
                        <Activity className="w-10 h-10" />
                      </div>
                      <h3 className="text-lg font-bold">Emergency Dispatch Active</h3>
                      <p className="text-xs text-slate-400">
                        An ambulance has been assigned and is tracking to your position. Please stay on this screen to watch real-time coordinates, or review the pre-arrival first aid directions.
                      </p>
                      <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-left text-xs font-mono space-y-1">
                        <p><span className="text-slate-500">Booking ID:</span> {trackingBooking.id}</p>
                        <p><span className="text-slate-500">Severity Level:</span> {trackingBooking.severity}</p>
                        <p><span className="text-slate-500">Target Hospital:</span> {hospitals.find(h => h.id === trackingBooking.destinationHospitalId)?.name}</p>
                        <p><span className="text-slate-500">ETA Estimate:</span> ~ {trackingBooking.estimatedArrivalMinutes} Mins</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB: HISTORY */}
            {activeTab === "history" && (
              <div className="lg:col-span-12 space-y-4">
                <h3 className="text-lg font-bold tracking-tight">Your Ambulance Bookings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookings.filter(b => b.patientId === currentUser.id).map((b) => (
                    <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
                          <span className="font-mono font-bold text-slate-300 uppercase">Trip {b.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            b.status === "completed"
                              ? "bg-emerald-950 border-emerald-900 text-emerald-400"
                              : b.status === "cancelled"
                                ? "bg-slate-950 border-slate-800 text-slate-500"
                                : "bg-amber-950 border-amber-900 text-amber-400 animate-pulse"
                          }`}>
                            {b.status}
                          </span>
                        </div>

                        <p className="text-slate-400 line-clamp-2 italic mb-2">"{b.symptoms}"</p>

                        <div className="space-y-1.5 text-[11px]">
                          <p className="flex items-center gap-1.5 text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            {hospitals.find(h => h.id === b.destinationHospitalId)?.name || "Hospital center"}
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {new Date(b.bookingTime).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 mt-2">
                        <button
                          onClick={() => setReportBooking(b)}
                          className="flex items-center gap-1.5 text-sky-400 font-semibold hover:text-sky-300 transition"
                        >
                          <FileText className="w-4 h-4" /> View Clinical Sheet
                        </button>

                        {b.status === "completed" && !b.feedback ? (
                          <button
                            onClick={() => setFeedbackBooking(b)}
                            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded text-[10px] transition"
                          >
                            Add Feedback
                          </button>
                        ) : b.feedback ? (
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            ★ {b.feedback.rating}/5
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {bookings.filter(b => b.patientId === currentUser.id).length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-500">
                      No medical transport bookings located in history.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: EMERGENCY CONTACTS */}
            {activeTab === "contacts" && (
              <div className="lg:col-span-12 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Form */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-base flex items-center gap-1.5">
                      <PlusCircle className="w-5 h-5 text-red-500" /> Save Emergency Contact
                    </h3>
                    <p className="text-xs text-slate-400">
                      These contacts are stored on your medical record and can be reached automatically during life-saving dispatches.
                    </p>

                    <form onSubmit={addContact} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Contact Name</label>
                        <input
                          type="text"
                          required
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Relationship</label>
                        <input
                          type="text"
                          required
                          value={newContactRelation}
                          onChange={(e) => setNewContactRelation(e.target.value)}
                          placeholder="Spouse, Brother, Parent"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Save Contact
                      </button>
                    </form>
                  </div>

                  {/* Right Column: List */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold tracking-tight">Active Safe Contacts</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-100 text-sm">{contact.name}</p>
                            <p className="text-xs text-slate-400 font-medium capitalize">{contact.relationship}</p>
                            <p className="text-xs text-sky-400 font-mono flex items-center gap-1 pt-1">
                              <Phone className="w-3 h-3 shrink-0" /> {contact.phone}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteContact(contact.id)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:bg-red-950/40 hover:border-red-900 text-slate-500 hover:text-red-400 transition"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {contacts.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-500 bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl">
                          No emergency contacts created yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            DRIVER ROLE INTERFACE
            ------------------------------------------------------------- */}
        {currentUser && currentUser.role === "driver" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: driver summary metrics */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-amber-500" /> EMT Pilot Portal
                </h3>

                {/* Driver information */}
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">EMT Specialist</p>
                    <p className="font-bold text-slate-200 text-sm mt-0.5">{currentUser.name}</p>
                    <p className="text-slate-400 font-mono mt-1">License: {drivers.find(d => d.id === currentUser.driverId)?.licenseNumber || "N/A"}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60">
                      <span className="text-slate-400">Pilot Rating:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1 font-mono text-sm">
                        ★ {drivers.find(d => d.id === currentUser.driverId)?.rating || "4.9"}
                      </span>
                    </div>
                  </div>

                  {/* Availability switch */}
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <span className="font-semibold text-slate-300">Status Availability:</span>
                    <button
                      onClick={() => {
                        const drv = drivers.find(d => d.id === currentUser.driverId);
                        if (drv) toggleDriverAvailability(drv.id, drv.available);
                      }}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition ${
                        drivers.find(d => d.id === currentUser.driverId)?.available
                          ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      {drivers.find(d => d.id === currentUser.driverId)?.available ? "Active Duty" : "Off Duty"}
                    </button>
                  </div>

                  {/* Connected Ambulance Status */}
                  {(() => {
                    const drvObj = drivers.find(d => d.id === currentUser.driverId);
                    const ambObj = ambulances.find(a => a.driverId === currentUser.driverId);
                    if (!ambObj) return null;
                    return (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                        <p className="text-slate-500 uppercase tracking-wider text-[9px] font-mono">Vehicle Registered</p>
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-slate-300">{ambObj.plateNumber}</span>
                          <span className="text-slate-400 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded uppercase">{ambObj.type}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1.5">
                          <span className="text-slate-400">Fuel Level:</span>
                          <span className={`font-bold ${ambObj.fuelLevel > 40 ? "text-emerald-400" : "text-rose-500"}`}>{ambObj.fuelLevel}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right side: active assigned booking */}
            <div className="lg:col-span-8 space-y-6">
              <h3 className="text-lg font-bold tracking-tight">Assigned Emergency Mission</h3>

              {trackingBooking ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  {/* Status Indicator Bar */}
                  <div className="absolute top-0 left-0 w-2 h-full bg-red-600" />
                  
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/60 pb-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-rose-950 text-rose-400 font-bold border border-rose-900 px-2 py-0.5 rounded font-mono uppercase">
                          Case #{trackingBooking.id}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded uppercase tracking-wider border ${
                          trackingBooking.severity === "Critical" ? "bg-red-950 border-red-800 text-red-400 animate-pulse" : "bg-amber-950 border-amber-900 text-amber-400"
                        }`}>
                          {trackingBooking.severity} Severity
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-200 mt-2">
                        Patient: {trackingBooking.patientName}
                      </h4>
                    </div>

                    <div className="text-right text-xs">
                      <p className="text-slate-500 font-mono">Dispatched ETA</p>
                      <p className="font-bold text-sky-400 font-mono text-sm">{trackingBooking.estimatedArrivalMinutes} Minutes</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Symptoms block */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs">
                      <p className="text-slate-500 uppercase tracking-wider text-[9px] font-mono mb-1.5">Dispatch Call Summary</p>
                      <p className="text-slate-300 font-medium italic">"{trackingBooking.symptoms}"</p>
                    </div>

                    {/* Routing Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                        <p className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" /> Pickup Position
                        </p>
                        <p className="font-semibold text-slate-200">{trackingBooking.pickupLocation.name}</p>
                        <p className="text-slate-500 text-[9px] mt-0.5">Coordinates: ({trackingBooking.pickupLocation.x}, {trackingBooking.pickupLocation.y})</p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                        <p className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-1 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-sky-400" /> Target Center
                        </p>
                        <p className="font-semibold text-slate-200">
                          {hospitals.find(h => h.id === trackingBooking.destinationHospitalId)?.name || "Target Hospital"}
                        </p>
                        <p className="text-slate-500 text-[9px] mt-0.5">Contact: {hospitals.find(h => h.id === trackingBooking.destinationHospitalId)?.phone}</p>
                      </div>
                    </div>

                    {/* AI Assistance Pre-arrival Guidance (Important for driver EMT coordination too) */}
                    {trackingBooking.aiAnalysis && (
                      <div className="bg-sky-950/20 border border-sky-900/40 p-4 rounded-xl text-xs space-y-1.5">
                        <h5 className="font-bold text-sky-400 flex items-center gap-1.5">
                          <Brain className="w-4 h-4" /> AI Diagnostics Support
                        </h5>
                        <p className="text-slate-300 font-medium">Recommended Department: {trackingBooking.aiAnalysis.suggestedHospitalSpecialization}</p>
                        <p className="text-slate-400">{trackingBooking.aiAnalysis.explanation}</p>
                      </div>
                    )}

                    {/* Simulation Map Tracker */}
                    <SimulationMap
                      hospitals={hospitals}
                      ambulances={ambulances}
                      drivers={drivers}
                      activeBooking={trackingBooking}
                      pickupX={undefined}
                      pickupY={undefined}
                    />

                    {/* Trigger Controls for trip stage transitions */}
                    <div className="pt-4 border-t border-slate-800/60 flex flex-wrap gap-3">
                      {trackingBooking.status === "pending" && (
                        <button
                          onClick={() => updateBookingStatusByDriver(trackingBooking.id, "accepted")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs transition"
                        >
                          Accept Booking & Activate Sirens
                        </button>
                      )}

                      {trackingBooking.status === "accepted" && (
                        <button
                          onClick={() => updateBookingStatusByDriver(trackingBooking.id, "in-transit")}
                          className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
                        >
                          <Truck className="w-4 h-4" /> Patient Loaded - Drive to Trauma Center
                        </button>
                      )}

                      {trackingBooking.status === "in-transit" && (
                        <button
                          onClick={() => updateBookingStatusByDriver(trackingBooking.id, "arrived")}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition"
                        >
                          Arrived at Hospital - Initiate Patient Handoff
                        </button>
                      )}

                      {trackingBooking.status === "arrived" && (
                        <button
                          onClick={() => updateBookingStatusByDriver(trackingBooking.id, "completed")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs transition"
                        >
                          Handoff Complete - Close Call and Return to Availability
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-200">No active dispatches.</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Your vehicle AMB-911-A is stationary. Make sure your Duty status is set to 'Active Duty' to listen for upcoming dispatch calls.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            HOSPITAL STAFF INTERFACE
            ------------------------------------------------------------- */}
        {currentUser && currentUser.role === "hospital" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Emergency Ward Controller</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Center: <span className="text-sky-400 font-semibold">{hospitals.find(h => h.id === currentUser.hospitalId)?.name}</span>
                </p>
              </div>

              {/* Bed capacity management */}
              {(() => {
                const hospObj = hospitals.find(h => h.id === currentUser.hospitalId);
                if (!hospObj) return null;
                return (
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="bg-slate-950 px-4 py-2.5 border border-slate-800 rounded-xl">
                      <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Trauma Ward Bed Occupancy</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{hospObj.availableBeds} Available</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-400">{hospObj.totalBeds} Beds</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateHospitalBeds(hospObj.id, Math.max(0, hospObj.availableBeds - 1), hospObj.totalBeds)}
                        className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-red-400 rounded-lg transition"
                        title="Book Bed"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateHospitalBeds(hospObj.id, Math.min(hospObj.totalBeds, hospObj.availableBeds + 1), hospObj.totalBeds)}
                        className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-emerald-400 rounded-lg transition"
                        title="Free Bed"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Emergency incoming board */}
              <div className="lg:col-span-8 space-y-4">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" /> Active Incoming Trauma Transports
                </h4>

                <div className="space-y-4">
                  {bookings.filter(b => b.destinationHospitalId === currentUser.hospitalId && ["pending", "accepted", "in-transit", "arrived"].includes(b.status)).map((b) => (
                    <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-3 relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded uppercase">
                              Transport {b.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              b.severity === "Critical" ? "bg-red-950 border-red-800 text-red-400 animate-pulse" : "bg-amber-950 border-amber-900 text-amber-400"
                            }`}>
                              {b.severity} Severity
                            </span>
                          </div>

                          <p className="text-slate-300 font-medium italic mt-2.5">"{b.symptoms}"</p>
                        </div>

                        <div className="text-right">
                          <p className="text-slate-500 font-mono text-[9px]">ETA</p>
                          <p className="font-bold text-sky-400 font-mono text-sm">{b.estimatedArrivalMinutes} Mins</p>
                        </div>
                      </div>

                      {/* AI recommendations */}
                      {b.aiAnalysis && (
                        <div className="bg-sky-950/20 border border-sky-900/40 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-bold text-sky-400 flex items-center gap-1">
                            <Brain className="w-3.5 h-3.5" /> AI Clinical Suggestion:
                          </p>
                          <p className="text-slate-300">Requires triage prep in: <span className="font-semibold text-slate-100">{b.aiAnalysis.suggestedHospitalSpecialization}</span></p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 mt-2 font-mono text-slate-400">
                        <span>Patient: {b.patientName}</span>
                        <span>Ambulance: {ambulances.find(a => a.id === b.selectedAmbulanceId)?.plateNumber || b.selectedAmbulanceId}</span>
                      </div>
                    </div>
                  ))}

                  {bookings.filter(b => b.destinationHospitalId === currentUser.hospitalId && ["pending", "accepted", "in-transit", "arrived"].includes(b.status)).length === 0 && (
                    <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-8 text-center text-slate-500">
                      No incoming ambulances at this hour.
                    </div>
                  )}
                </div>
              </div>

              {/* Local Ambulances Fleet management */}
              <div className="lg:col-span-4 space-y-4">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-sky-400" /> Hospital Ambulance Fleet
                </h4>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  {ambulances.filter(a => a.hospitalId === currentUser.hospitalId).map((a) => (
                    <div key={a.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-2">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-slate-200">{a.plateNumber}</span>
                        <span className={`px-2 py-0.5 text-[8px] rounded uppercase font-bold tracking-wider ${
                          a.status === "available"
                            ? "bg-emerald-950 text-emerald-400"
                            : a.status === "on-trip"
                              ? "bg-amber-950 text-amber-400"
                              : "bg-slate-800 text-slate-400"
                        }`}>
                          {a.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Type: {a.type}</span>
                        <span>Driver: {drivers.find(d => d.id === a.driverId)?.name || "Not assigned"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            ADMIN CONSOLE INTERFACE
            ------------------------------------------------------------- */}
        {currentUser && currentUser.role === "admin" && (
          <div className="space-y-6">
            
            {/* Horizontal Sub tabs switcher */}
            <div className="flex flex-wrap gap-2.5 bg-slate-900 border border-slate-800 p-2 rounded-2xl text-xs">
              {[
                { key: "dashboard", label: "Analytics Dashboard", icon: Activity },
                { key: "bookings", label: "Manage Emergency Cases", icon: ShieldAlert },
                { key: "ambulances", label: "Manage Ambulances", icon: Truck },
                { key: "hospitals", label: "Manage Hospitals", icon: Building2 },
                { key: "drivers", label: "Manage Driver Pilots", icon: UserIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setAdminTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition ${
                      adminTab === tab.key
                        ? "bg-red-600 text-white shadow-md shadow-red-600/10"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB: ANALYTICS DASHBOARD */}
            {adminTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Visual Bento Grid Statistics Counters */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider">Active Emergencies</p>
                    <p className="text-2xl font-bold font-mono text-red-500 mt-1">{stats?.activeBookings || 0}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Siren operations active</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider">Critical Cases</p>
                    <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{stats?.criticalCases || 0}</p>
                    <p className="text-[10px] text-slate-400 mt-1">High-triage intensive care</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider">Available Responders</p>
                    <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats?.availableAmbulances || 0}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Ready for dispatch</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider">Total Booking History</p>
                    <p className="text-2xl font-bold font-mono text-sky-400 mt-1">{stats?.totalBookingsCount || 0}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Logged historical responses</p>
                  </div>
                </div>

                {/* Dashboard Maps Visualizer and Statistics Graph mockup */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Central Map */}
                  <div className="lg:col-span-8">
                    <SimulationMap
                      hospitals={hospitals}
                      ambulances={ambulances}
                      drivers={drivers}
                    />
                  </div>

                  {/* SVG Chart showing Emergency Severity distribution */}
                  <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-4">
                    <h4 className="font-bold text-sm tracking-tight border-b border-slate-800 pb-2">Emergency Severity Matrix</h4>
                    
                    {/* Beautiful SVG donut / pie chart */}
                    <div className="flex justify-center py-4">
                      <svg className="w-36 h-36" viewBox="0 0 36 36">
                        {/* Critical Segment (Red) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="25" />
                        {/* High Segment (Rose) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="95" />
                        {/* Moderate Segment (Amber) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="120" />
                        {/* Low Segment (Blue) */}
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="150" />
                        
                        <text x="18" y="20.5" className="font-bold fill-slate-100 text-[5px] text-anchor-middle font-mono" style={{ textAnchor: "middle" }}>
                          AI TRIAGE
                        </text>
                      </svg>
                    </div>

                    {/* Chart Legend with counts */}
                    <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <span className="text-slate-300">Critical: 30%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-slate-300">High: 25%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-slate-300">Moderate: 30%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-slate-300">Low: 15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BOOKINGS MANAGEMENT */}
            {adminTab === "bookings" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">Case ID</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Symptoms</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Hospital</th>
                      <th className="py-2.5 px-3">Vehicle / EMT</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-950/40">
                        <td className="py-3 px-3 font-bold font-mono text-slate-300">{b.id}</td>
                        <td className="py-3 px-3">{b.patientName}</td>
                        <td className="py-3 px-3 max-w-[180px] truncate italic" title={b.symptoms}>"{b.symptoms}"</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.severity === "Critical" ? "bg-red-950 border border-red-800 text-red-400" : b.severity === "High" ? "bg-rose-950 text-rose-400" : "bg-amber-950 text-amber-400"
                          }`}>
                            {b.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3">{hospitals.find(h => h.id === b.destinationHospitalId)?.name || b.destinationHospitalId}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {ambulances.find(a => a.id === b.selectedAmbulanceId)?.plateNumber} / {drivers.find(d => d.id === b.selectedDriverId)?.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize">{b.status}</span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setReportBooking(b)}
                            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded transition flex items-center gap-1 font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5" /> Clinical Log
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: AMBULANCES CRUD */}
            {adminTab === "ambulances" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold">Ambulance Fleet List</h3>
                  <button
                    onClick={() => setShowAddAmbulance(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Ambulance Vehicle
                  </button>
                </div>

                {showAddAmbulance && (
                  <form onSubmit={handleAddAmbulance} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Plate Number</label>
                      <input
                        type="text"
                        required
                        value={ambPlate}
                        onChange={(e) => setAmbPlate(e.target.value)}
                        placeholder="AMB-123-X"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Ambulance Type</label>
                      <select
                        value={ambType}
                        onChange={(e: any) => setAmbType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500"
                      >
                        <option value="BLS">BLS (Basic Life Support)</option>
                        <option value="ALS">ALS (Advanced Life Support)</option>
                        <option value="ICU">ICU (Intensive Care Mobile)</option>
                        <option value="Patient Transport">Patient Transport</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Assign Driver</label>
                      <select
                        value={ambDriverId}
                        onChange={(e) => setAmbDriverId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500"
                      >
                        <option value="">Select Driver</option>
                        {drivers.filter(d => !d.ambulanceId).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Affiliated Hospital</label>
                      <select
                        value={ambHospId}
                        onChange={(e) => setAmbHospId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500"
                      >
                        <option value="">Select Hospital</option>
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4 flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddAmbulance(false)}
                        className="bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-xl font-semibold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-xl transition"
                      >
                        Submit Fleet Vehicle
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs p-3">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-2">Ambulance ID</th>
                        <th className="py-2.5 px-2">Plate Number</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2">Operational Status</th>
                        <th className="py-2.5 px-2">Assigned Driver</th>
                        <th className="py-2.5 px-2">Station Base</th>
                        <th className="py-2.5 px-2">Fuel Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {ambulances.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-950/20">
                          <td className="py-3 px-2 font-mono">{a.id}</td>
                          <td className="py-3 px-2 font-bold font-mono text-slate-300">{a.plateNumber}</td>
                          <td className="py-3 px-2">{a.type}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              a.status === "available" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-2">{drivers.find(d => d.id === a.driverId)?.name || "Unassigned"}</td>
                          <td className="py-3 px-2">{hospitals.find(h => h.id === a.hospitalId)?.name || "Dispatch Headquarters"}</td>
                          <td className="py-3 px-2 font-mono font-bold">{a.fuelLevel}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: HOSPITALS CRUD */}
            {adminTab === "hospitals" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold">Trauma Centers Registry</h3>
                  <button
                    onClick={() => setShowAddHospital(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Medical Center
                  </button>
                </div>

                {showAddHospital && (
                  <form onSubmit={handleAddHospital} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Center Name</label>
                      <input
                        type="text"
                        required
                        value={hospName}
                        onChange={(e) => setHospName(e.target.value)}
                        placeholder="Mercy Trauma Center"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Specializations (comma separated)</label>
                      <input
                        type="text"
                        required
                        value={hospSpec}
                        onChange={(e) => setHospSpec(e.target.value)}
                        placeholder="Cardiac Care Center, Trauma Level 1"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Total Emergency Beds</label>
                      <input
                        type="number"
                        required
                        value={hospBeds}
                        onChange={(e) => setHospBeds(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Contact Dispatch Phone</label>
                      <input
                        type="text"
                        required
                        value={hospPhone}
                        onChange={(e) => setHospPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Grid Coordinate X (0-100)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={hospX}
                        onChange={(e) => setHospX(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Grid Coordinate Y (0-100)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={hospY}
                        onChange={(e) => setHospY(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div className="md:col-span-4 flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddHospital(false)}
                        className="bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-xl font-semibold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-xl transition"
                      >
                        Submit Medical Registry
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs p-3">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-2">Hospital ID</th>
                        <th className="py-2.5 px-2">Name</th>
                        <th className="py-2.5 px-2">Department Specialty Core</th>
                        <th className="py-2.5 px-2">Grid Position</th>
                        <th className="py-2.5 px-2">Critical Bed Status</th>
                        <th className="py-2.5 px-2">Phone Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-medium">
                      {hospitals.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-950/20">
                          <td className="py-3 px-2 font-mono">{h.id}</td>
                          <td className="py-3 px-2 font-bold text-slate-300">{h.name}</td>
                          <td className="py-3 px-2 text-sky-400 italic">{h.specializations.join(" • ")}</td>
                          <td className="py-3 px-2 font-mono">({h.x}, {h.y})</td>
                          <td className="py-3 px-2 font-mono">
                            {h.availableBeds} / {h.totalBeds} Free
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-300">{h.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: DRIVERS */}
            {adminTab === "drivers" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs p-3">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-2">Pilot ID</th>
                      <th className="py-2.5 px-2">EMT Operator Name</th>
                      <th className="py-2.5 px-2">License Reference</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2">Vehicle Plate</th>
                      <th className="py-2.5 px-2">Grid Coordinate</th>
                      <th className="py-2.5 px-2">Performance Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-medium">
                    {drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-950/20">
                        <td className="py-3 px-2 font-mono">{d.id}</td>
                        <td className="py-3 px-2 font-bold text-slate-300">{d.name}</td>
                        <td className="py-3 px-2 font-mono">{d.licenseNumber}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            d.available ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"
                          }`}>
                            {d.available ? "Duty Active" : "Stationary"}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-300">
                          {ambulances.find(a => a.id === d.ambulanceId)?.plateNumber || "Not assigned"}
                        </td>
                        <td className="py-3 px-2 font-mono">({d.x}, {d.y})</td>
                        <td className="py-3 px-2 text-amber-400 font-bold">★ {d.rating} / 5</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER ACCENTS */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 font-mono mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Emergency Medical Services Command. AI-enabled Intelligent Dispatch Gateway.</p>
          <p className="mt-1">Built with React + Vite + Node.js Express. Powered by Google Gemini AI.</p>
        </div>
      </footer>

      {/* -------------------------------------------------------------
          FEEDBACK MODAL SUBMISSION
          ------------------------------------------------------------- */}
      <AnimatePresence>
        {feedbackBooking && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full text-xs space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setFeedbackBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-base font-bold tracking-tight">Submit Emergency Call Feedback</h3>
              <p className="text-slate-400">Your review helps our paramedics maintain stellar emergency response performance ratings.</p>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Paramedic and Speed Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFbRating(star)}
                        className="p-1 text-slate-500 hover:text-amber-400 transition"
                      >
                        <Star className={`w-6 h-6 ${fbRating >= star ? "text-amber-400 fill-amber-400" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Comments</label>
                  <textarea
                    value={fbComments}
                    onChange={(e) => setFbComments(e.target.value)}
                    placeholder="Enter any feedback regarding EMT arrival speed, clinical assistance, or paramedic care..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackBooking(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition"
                  >
                    Submit Performance Rating
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          CLINICAL CLINIC TRIP SUMMARY REPORT MODAL (PDF-ready printable view)
          ------------------------------------------------------------- */}
      <AnimatePresence>
        {reportBooking && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-900 border border-slate-300 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative font-sans my-8"
              id="clinical-report-sheet"
            >
              {/* Close Button (Hidden in Print) */}
              <button
                onClick={() => setReportBooking(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 print:hidden"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Print Action Header (Hidden in Print) */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 print:hidden">
                <span className="text-xs font-bold text-sky-600 tracking-wider uppercase font-mono">OFFICIAL MEDICAL CLINICAL SUMMARY</span>
                <button
                  onClick={printReport}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  <Download className="w-4 h-4" /> Download/Print Clinical Sheet (PDF)
                </button>
              </div>

              {/* REPORT SHEET CONTENT */}
              <div className="space-y-6">
                {/* Medical Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">EMERGENCY MEDICAL DISPATCH COMMAND</h2>
                    <p className="text-xs text-slate-500 font-mono">Case Clinical Log Sheet • Department of Public Health</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono">Log ID: {reportBooking.id}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Date: {new Date(reportBooking.bookingTime).toLocaleString()}</p>
                  </div>
                </div>

                {/* Patient / Dispatch Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-100 p-3 rounded-xl">
                    <p className="font-mono font-bold text-[10px] text-slate-500 uppercase">Patient Information</p>
                    <p className="font-bold text-sm text-slate-800 mt-1">{reportBooking.patientName}</p>
                    <p className="mt-0.5 text-slate-600">Contact: {reportBooking.patientPhone}</p>
                    <p className="mt-0.5 text-slate-600">Pickup: {reportBooking.pickupLocation.name}</p>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-xl">
                    <p className="font-mono font-bold text-[10px] text-slate-500 uppercase">Emergency Dispatch Unit</p>
                    <p className="font-bold text-sm text-slate-800 mt-1">Vehicle: {ambulances.find(a => a.id === reportBooking.selectedAmbulanceId)?.plateNumber || reportBooking.selectedAmbulanceId}</p>
                    <p className="mt-0.5 text-slate-600">EMT Specialist: {drivers.find(d => d.id === reportBooking.selectedDriverId)?.name || reportBooking.selectedDriverId}</p>
                    <p className="mt-0.5 text-slate-600">Target Station: {hospitals.find(h => h.id === reportBooking.destinationHospitalId)?.name || reportBooking.destinationHospitalId}</p>
                  </div>
                </div>

                {/* Patient symptoms */}
                <div className="space-y-1.5">
                  <h4 className="font-mono font-bold text-[10px] text-slate-500 uppercase">Reported Case Narrative</h4>
                  <p className="text-xs text-slate-800 font-medium italic border-l-4 border-slate-300 pl-3">
                    "{reportBooking.symptoms}"
                  </p>
                </div>

                {/* AI Triage Matrix */}
                {reportBooking.aiAnalysis && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <h4 className="font-mono font-bold text-[10px] text-sky-700 uppercase flex items-center gap-1">
                      <Brain className="w-4 h-4 text-sky-600" /> AI Triage Intelligence Diagnostics
                    </h4>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-mono">Severity Status</p>
                        <p className="font-bold text-red-600 mt-0.5">{reportBooking.aiAnalysis.severity}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-mono">Dispatched Rig Type</p>
                        <p className="font-bold text-slate-800 mt-0.5">{reportBooking.aiAnalysis.recommendedAmbulanceType}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-mono">Suggested Ward Unit</p>
                        <p className="font-bold text-slate-800 mt-0.5">{reportBooking.aiAnalysis.suggestedHospitalSpecialization}</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 pt-2 border-t border-slate-200">
                      <p className="font-semibold text-slate-900 mb-0.5">Clinical Diagnostics Reason:</p>
                      <p>{reportBooking.aiAnalysis.explanation}</p>
                    </div>

                    <div className="text-xs text-slate-700 pt-2 border-t border-slate-200">
                      <p className="font-semibold text-slate-900 mb-0.5">Dispatched Guidance & Pre-Arrival First Aid:</p>
                      <p className="whitespace-pre-line leading-relaxed">{reportBooking.aiAnalysis.firstAidInstructions}</p>
                    </div>
                  </div>
                )}

                {/* Log verification */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-6 border-t border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Dispatch Operator</p>
                    <div className="h-10 border-b border-slate-300 mt-2" />
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Authorized Digital Signature</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Receiving Trauma Unit Physician</p>
                    <div className="h-10 border-b border-slate-300 mt-2" />
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Authorized Digital Signature</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
