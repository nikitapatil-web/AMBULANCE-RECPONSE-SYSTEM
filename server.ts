import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// TYPES & INTERFACES
// -------------------------------------------------------------
export type UserRole = "patient" | "driver" | "hospital" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string; // for hospital staff
  driverId?: string; // for drivers
}

export interface Hospital {
  id: string;
  name: string;
  specializations: string[];
  x: number;
  y: number;
  phone: string;
  totalBeds: number;
  availableBeds: number;
}

export type AmbulanceType = "BLS" | "ALS" | "ICU" | "Patient Transport";
export type AmbulanceStatus = "available" | "on-trip" | "maintenance";

export interface Ambulance {
  id: string;
  plateNumber: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  driverId: string;
  hospitalId: string;
  fuelLevel: number;
  lastService: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  available: boolean;
  x: number;
  y: number;
  rating: number;
  ambulanceId?: string;
}

export type BookingStatus = "pending" | "accepted" | "in-transit" | "arrived" | "completed" | "cancelled";
export type EmergencySeverity = "Critical" | "High" | "Moderate" | "Low";

export interface Booking {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  symptoms: string;
  severity: EmergencySeverity;
  pickupLocation: {
    name: string;
    x: number;
    y: number;
  };
  destinationHospitalId: string;
  selectedAmbulanceId: string;
  selectedDriverId: string;
  status: BookingStatus;
  bookingTime: string;
  estimatedArrivalMinutes: number;
  aiAnalysis?: {
    severity: EmergencySeverity;
    recommendedAmbulanceType: AmbulanceType;
    suggestedHospitalSpecialization: string;
    explanation: string;
    firstAidInstructions: string;
    etaReasoning: string;
  };
  feedback?: {
    rating: number;
    comments: string;
    timestamp: string;
  };
  ambulanceX?: number; // active tracking coord x
  ambulanceY?: number; // active tracking coord y
}

export interface EmergencyContact {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  phone: string;
}

// -------------------------------------------------------------
// IN-MEMORY DATABASE & PRE-POPULATED DATA
// -------------------------------------------------------------
let users: User[] = [
  { id: "usr_admin", email: "admin@emergency.org", name: "System Commander", role: "admin" },
  { id: "usr_patient_1", email: "patient@gmail.com", name: "Nikita Patil", role: "patient", phone: "+1 (555) 123-4567" },
  { id: "usr_driver_1", email: "driver1@ambulance.org", name: "Robert Miller", role: "driver", phone: "+1 (555) 200-0001", driverId: "drv_1" },
  { id: "usr_driver_2", email: "driver2@ambulance.org", name: "Marcus Cooper", role: "driver", phone: "+1 (555) 200-0002", driverId: "drv_2" },
  { id: "usr_driver_3", email: "driver3@ambulance.org", name: "John Davis", role: "driver", phone: "+1 (555) 200-0003", driverId: "drv_3" },
  { id: "usr_hosp_1", email: "staff@citycentral.org", name: "Dr. Sarah Jenkins", role: "hospital", hospitalId: "hosp_1" },
  { id: "usr_hosp_2", email: "staff@cardiacinstitute.org", name: "Dr. Alan Mercer", role: "hospital", hospitalId: "hosp_2" }
];

let hospitals: Hospital[] = [
  { id: "hosp_1", name: "City Central General Hospital", specializations: ["General Emergency", "Pediatric Care"], x: 45, y: 50, phone: "+1 (555) 100-2001", totalBeds: 120, availableBeds: 45 },
  { id: "hosp_2", name: "Metro Cardiac & Vascular Institute", specializations: ["Cardiac Care Center", "General Emergency"], x: 20, y: 35, phone: "+1 (555) 100-2002", totalBeds: 80, availableBeds: 12 },
  { id: "hosp_3", name: "St. Jude Trauma Level-1 Center", specializations: ["Trauma Level 1", "Burn Center", "General Emergency"], x: 75, y: 70, phone: "+1 (555) 100-2003", totalBeds: 150, availableBeds: 18 },
  { id: "hosp_4", name: "Mercy Children's & Family Hospital", specializations: ["Pediatric Care", "General Emergency"], x: 30, y: 75, phone: "+1 (555) 100-2004", totalBeds: 90, availableBeds: 28 },
  { id: "hosp_5", name: "Eastside Trauma & Burn Center", specializations: ["Trauma Level 1", "Burn Center"], x: 85, y: 25, phone: "+1 (555) 100-2005", totalBeds: 70, availableBeds: 15 }
];

let drivers: Driver[] = [
  { id: "drv_1", name: "Robert Miller", phone: "+1 (555) 200-0001", licenseNumber: "DL-908721A", available: true, x: 15, y: 20, rating: 4.8, ambulanceId: "amb_1" },
  { id: "drv_2", name: "Marcus Cooper", phone: "+1 (555) 200-0002", licenseNumber: "DL-512044C", available: true, x: 50, y: 40, rating: 4.9, ambulanceId: "amb_2" },
  { id: "drv_3", name: "John Davis", phone: "+1 (555) 200-0003", licenseNumber: "DL-881902K", available: true, x: 80, y: 80, rating: 4.5, ambulanceId: "amb_3" },
  { id: "drv_4", name: "Jessica Carter", phone: "+1 (555) 200-0004", licenseNumber: "DL-227618Z", available: false, x: 40, y: 75, rating: 4.7, ambulanceId: "amb_4" }
];

let ambulances: Ambulance[] = [
  { id: "amb_1", plateNumber: "AMB-911-A", type: "ICU", status: "available", driverId: "drv_1", hospitalId: "hosp_2", fuelLevel: 92, lastService: "2026-06-15" },
  { id: "amb_2", plateNumber: "AMB-502-B", type: "ALS", status: "available", driverId: "drv_2", hospitalId: "hosp_1", fuelLevel: 78, lastService: "2026-05-20" },
  { id: "amb_3", plateNumber: "AMB-104-C", type: "BLS", status: "available", driverId: "drv_3", hospitalId: "hosp_3", fuelLevel: 85, lastService: "2026-06-01" },
  { id: "amb_4", plateNumber: "AMB-777-D", type: "Patient Transport", status: "maintenance", driverId: "drv_4", hospitalId: "hosp_4", fuelLevel: 10, lastService: "2026-07-02" }
];

let bookings: Booking[] = [
  {
    id: "bk_1001",
    patientId: "usr_patient_1",
    patientName: "Nikita Patil",
    patientPhone: "+1 (555) 123-4567",
    symptoms: "Patient fell off a ladder, complaining of sharp lower back pain and suspected leg fracture. Conscious but unable to stand.",
    severity: "High",
    pickupLocation: { name: "128 Oakridge Ave", x: 60, y: 45 },
    destinationHospitalId: "hosp_3",
    selectedAmbulanceId: "amb_3",
    selectedDriverId: "drv_3",
    status: "completed",
    bookingTime: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    estimatedArrivalMinutes: 12,
    aiAnalysis: {
      severity: "High",
      recommendedAmbulanceType: "ALS",
      suggestedHospitalSpecialization: "Trauma Level 1",
      explanation: "Suspected skeletal fracture with severe pain warrants Advanced Life Support (ALS) to administer pain management and immobilization. Patient is stable but requires trauma evaluation.",
      firstAidInstructions: "1. Do not attempt to move the patient to avoid spinal cord complications.\n2. Keep the patient warm and calm.\n3. Splint the leg if trained, otherwise leave in place and control any minor external bleeding with direct gentle pressure.",
      etaReasoning: "Located 6.5 miles from Trauma Center. ALS ambulance dispatched with normal response speed."
    },
    feedback: {
      rating: 5,
      comments: "Extremely fast response! The paramedics were highly professional and stabilized my leg immediately.",
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  },
  {
    id: "bk_1002",
    patientId: "usr_patient_1",
    patientName: "Nikita Patil",
    patientPhone: "+1 (555) 123-4567",
    symptoms: "Elderly family member is experiencing sudden crushing chest pain radiating to left arm, sweating heavily, short of breath.",
    severity: "Critical",
    pickupLocation: { name: "45 Pineview Dr", x: 22, y: 30 },
    destinationHospitalId: "hosp_2",
    selectedAmbulanceId: "amb_1",
    selectedDriverId: "drv_1",
    status: "in-transit",
    bookingTime: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    estimatedArrivalMinutes: 5,
    ambulanceX: 18,
    ambulanceY: 26,
    aiAnalysis: {
      severity: "Critical",
      recommendedAmbulanceType: "ICU",
      suggestedHospitalSpecialization: "Cardiac Care Center",
      explanation: "Crushing chest pain radiating to arm with diaphoresis (sweating) is highly indicative of an Acute Myocardial Infarction (Heart Attack). ICU ambulance with cardiac monitoring and life support equipment is mandatory.",
      firstAidInstructions: "1. Have the patient sit down and rest. Avoid all exertion.\n2. If the patient has prescribed nitroglycerin, assist them in taking it.\n3. If conscious and not allergic, have them chew an aspirin (325mg).\n4. Prepare for CPR and locator monitoring in case of loss of consciousness.",
      etaReasoning: "High priority priority status. Cardiac Unit AMB-911-A is nearby (approx 2 miles away), traveling under emergency sirens. Estimated arrival is exceptionally quick."
    }
  }
];

let emergencyContacts: EmergencyContact[] = [
  { id: "cnt_1", patientId: "usr_patient_1", name: "Anish Patil", relationship: "Brother", phone: "+1 (555) 888-1122" },
  { id: "cnt_2", patientId: "usr_patient_1", name: "Sunita Patil", relationship: "Mother", phone: "+1 (555) 888-3344" }
];

// -------------------------------------------------------------
// LAZY-INITIALIZE GEMINI AI SDK
// -------------------------------------------------------------
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "") {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// FALLBACK AI ENGINE (Highly responsive medical rules-based classifier)
function fallbackAnalyzeEmergency(symptoms: string) {
  const text = symptoms.toLowerCase();
  let severity: EmergencySeverity = "Moderate";
  let recommendedAmbulanceType: AmbulanceType = "BLS";
  let suggestedHospitalSpecialization = "General Emergency";
  let explanation = "Standard medical emergency evaluation.";
  let firstAidInstructions = "Keep calm, rest comfortably, and wait for paramedic arrival.";
  let etaReasoning = "Dispatched closest standard emergency response vehicle.";

  if (
    text.includes("heart") ||
    text.includes("chest pain") ||
    text.includes("stroke") ||
    text.includes("unconscious") ||
    text.includes("breathing") ||
    text.includes("cardiac") ||
    text.includes("choking") ||
    text.includes("seizure") ||
    text.includes("no pulse")
  ) {
    severity = "Critical";
    recommendedAmbulanceType = "ICU";
    suggestedHospitalSpecialization = "Cardiac Care Center";
    explanation = "Symptoms suggest a severe cardiopulmonary or neurological threat requiring intensive care support, direct cardiac monitoring, or immediate life-saving airway intervention.";
    firstAidInstructions = "1. Have the patient rest completely; do not allow physical movement.\n2. Loosen tight clothing around neck.\n3. Keep airways clear. Prepare for immediate CPR if breathing stops or pulse is lost.";
    etaReasoning = "Sirens active. Nearest intensive care ambulance route prioritised. Traffic signals managed.";
  } else if (
    text.includes("accident") ||
    text.includes("fracture") ||
    text.includes("broken") ||
    text.includes("bleeding") ||
    text.includes("deep cut") ||
    text.includes("fall") ||
    text.includes("burn") ||
    text.includes("severe pain")
  ) {
    severity = "High";
    recommendedAmbulanceType = "ALS";
    suggestedHospitalSpecialization = "Trauma Level 1";
    explanation = "Severe trauma, deep hemorrhage, or painful structural bone fracture requires advanced stabilization, intravenous pain control, and trauma monitoring.";
    firstAidInstructions = "1. Apply firm, direct pressure on any open bleeding wounds with a clean cloth.\n2. Do not attempt to realign broken bones or move suspicious spinal injuries.\n3. Elevate bleeding limbs above heart if bone is not broken.";
    etaReasoning = "Priority trauma dispatch. Route traffic analyzed. High transit speeds maintained.";
  } else if (
    text.includes("fever") ||
    text.includes("vomiting") ||
    text.includes("stomach") ||
    text.includes("migraine") ||
    text.includes("asthma") ||
    text.includes("diabetic") ||
    text.includes("allergic")
  ) {
    severity = "Moderate";
    recommendedAmbulanceType = "BLS";
    suggestedHospitalSpecialization = "General Emergency";
    explanation = "Urgent medical monitoring requested for acute pain, high fever, or moderate asthma. Basic life support (BLS) is equipped to administer oxygen and first-line treatment.";
    firstAidInstructions = "1. Assist patient in taking any prescribed asthma inhaler or insulin if applicable.\n2. Keep patient hydrated in sitting position.\n3. Cool forehead with wet cloth for high fevers.";
    etaReasoning = "Standard response speed. Dispatched nearest local community ambulance.";
  } else {
    severity = "Low";
    recommendedAmbulanceType = "Patient Transport";
    suggestedHospitalSpecialization = "General Emergency";
    explanation = "Non-life-threatening clinical transfer, routine checkup, or minor ailment. Standard passenger support with basic medical oversight.";
    firstAidInstructions = "1. Pack essential identification and medical cards.\n2. Remain hydrated and sit quietly.";
    etaReasoning = "Scheduled dispatch time. Safe, steady, comfortable routing.";
  }

  return {
    severity,
    recommendedAmbulanceType,
    suggestedHospitalSpecialization,
    explanation,
    firstAidInstructions,
    etaReasoning
  };
}

// -------------------------------------------------------------
// BACKEND API ENDPOINTS
// -------------------------------------------------------------

// Global analytical summary
app.get("/api/dashboard/stats", (req, res) => {
  const activeCount = bookings.filter(b => ["pending", "accepted", "in-transit", "arrived"].includes(b.status)).length;
  const criticalCount = bookings.filter(b => b.severity === "Critical" && b.status !== "completed" && b.status !== "cancelled").length;
  const driverAvail = drivers.filter(d => d.available).length;
  const ambAvail = ambulances.filter(a => a.status === "available").length;

  res.json({
    activeBookings: activeCount,
    criticalCases: criticalCount,
    availableDrivers: driverAvail,
    availableAmbulances: ambAvail,
    totalBookingsCount: bookings.length,
    hospitalsCount: hospitals.length,
    ambulancesCount: ambulances.length,
    driversCount: drivers.length
  });
});

// Authentication APIs
app.post("/api/auth/login", (req, res) => {
  const { email, role } = req.body;
  let user = users.find(u => u.email === email && (!role || u.role === role));
  if (!user) {
    // Auto-create or login with a default placeholder matching requested role
    const formattedName = email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
    const newId = "usr_" + Math.random().toString(36).substr(2, 9);
    user = {
      id: newId,
      email: email,
      name: formattedName || "User Guest",
      role: role || "patient",
      phone: "+1 (555) 999-0000"
    };
    if (role === "driver") {
      // link to a free driver
      const freeDriver = drivers.find(d => !d.ambulanceId) || drivers[0];
      user.driverId = freeDriver.id;
    } else if (role === "hospital") {
      user.hospitalId = "hosp_1";
    }
    users.push(user);
  }
  res.json({ success: true, user });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, role } = req.body;
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ error: "User with this email already exists" });
  }
  const id = "usr_" + Math.random().toString(36).substr(2, 9);
  const newUser: User = { id, email, name, role: role || "patient", phone };
  users.push(newUser);
  res.json({ success: true, user: newUser });
});

// Hospitals CRUD
app.get("/api/hospitals", (req, res) => {
  res.json(hospitals);
});

app.post("/api/hospitals", (req, res) => {
  const { name, specializations, x, y, phone, totalBeds } = req.body;
  const newHospital: Hospital = {
    id: "hosp_" + (hospitals.length + 1),
    name,
    specializations: specializations || ["General Emergency"],
    x: Number(x) || 50,
    y: Number(y) || 50,
    phone: phone || "+1 (555) 000-0000",
    totalBeds: Number(totalBeds) || 100,
    availableBeds: Number(totalBeds) || 100
  };
  hospitals.push(newHospital);
  res.json({ success: true, hospital: newHospital });
});

app.put("/api/hospitals/:id", (req, res) => {
  const { id } = req.params;
  const index = hospitals.findIndex(h => h.id === id);
  if (index === -1) return res.status(404).json({ error: "Hospital not found" });

  hospitals[index] = { ...hospitals[index], ...req.body };
  res.json({ success: true, hospital: hospitals[index] });
});

// Ambulances CRUD
app.get("/api/ambulances", (req, res) => {
  res.json(ambulances);
});

app.post("/api/ambulances", (req, res) => {
  const { plateNumber, type, driverId, hospitalId, fuelLevel } = req.body;
  const newAmbulance: Ambulance = {
    id: "amb_" + (ambulances.length + 1),
    plateNumber,
    type: type || "BLS",
    status: "available",
    driverId: driverId || "",
    hospitalId: hospitalId || "hosp_1",
    fuelLevel: Number(fuelLevel) || 100,
    lastService: new Date().toISOString().split("T")[0]
  };
  ambulances.push(newAmbulance);

  if (driverId) {
    const dIdx = drivers.findIndex(d => d.id === driverId);
    if (dIdx !== -1) drivers[dIdx].ambulanceId = newAmbulance.id;
  }

  res.json({ success: true, ambulance: newAmbulance });
});

app.put("/api/ambulances/:id", (req, res) => {
  const { id } = req.params;
  const index = ambulances.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: "Ambulance not found" });

  const oldDriverId = ambulances[index].driverId;
  ambulances[index] = { ...ambulances[index], ...req.body };

  if (req.body.driverId && req.body.driverId !== oldDriverId) {
    // unlink old
    const oldDIdx = drivers.findIndex(d => d.id === oldDriverId);
    if (oldDIdx !== -1) drivers[oldDIdx].ambulanceId = undefined;
    // link new
    const newDIdx = drivers.findIndex(d => d.id === req.body.driverId);
    if (newDIdx !== -1) drivers[newDIdx].ambulanceId = id;
  }

  res.json({ success: true, ambulance: ambulances[index] });
});

// Drivers CRUD
app.get("/api/drivers", (req, res) => {
  res.json(drivers);
});

app.put("/api/drivers/:id", (req, res) => {
  const { id } = req.params;
  const index = drivers.findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: "Driver not found" });

  drivers[index] = { ...drivers[index], ...req.body };
  res.json({ success: true, driver: drivers[index] });
});

// Emergency Contacts CRUD
app.get("/api/emergency-contacts", (req, res) => {
  const { patientId } = req.query;
  if (patientId) {
    res.json(emergencyContacts.filter(c => c.patientId === patientId));
  } else {
    res.json(emergencyContacts);
  }
});

app.post("/api/emergency-contacts", (req, res) => {
  const { patientId, name, relationship, phone } = req.body;
  const newContact: EmergencyContact = {
    id: "cnt_" + Math.random().toString(36).substr(2, 9),
    patientId: patientId || "usr_patient_1",
    name,
    relationship,
    phone
  };
  emergencyContacts.push(newContact);
  res.json({ success: true, contact: newContact });
});

app.delete("/api/emergency-contacts/:id", (req, res) => {
  const { id } = req.params;
  const idx = emergencyContacts.findIndex(c => c.id === id);
  if (idx !== -1) {
    emergencyContacts.splice(idx, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Contact not found" });
  }
});

// AI EMERGENCY TRIAGE & BOOKING RECOMMENDATION
app.post("/api/ai/analyze-emergency", async (req, res) => {
  const { symptoms, pickupLocation } = req.body;
  if (!symptoms) {
    return res.status(400).json({ error: "Symptoms description is required" });
  }

  // Calculate coordinates distance locally to feed recommendation data
  const px = pickupLocation?.x ?? 50;
  const py = pickupLocation?.y ?? 50;

  // Let's call Gemini to provide triaging, medical explanation, and suggestions!
  const client = getAIClient();
  let aiResults;

  if (client) {
    try {
      const prompt = `You are an AI-powered Emergency Triage Medical Assistant inside an emergency dispatch application.
Analyze the following patient's symptoms:
"${symptoms}"

Based on this, classify and return exactly:
1. severity: Must be one of ["Critical", "High", "Moderate", "Low"].
2. recommendedAmbulanceType: Must be one of ["ICU", "ALS", "BLS", "Patient Transport"].
3. suggestedHospitalSpecialization: The exact matching hospital department specialty (e.g. "Cardiac Care Center", "Trauma Level 1", "Pediatric Care", "Burn Center", "General Emergency").
4. explanation: 2-3 sentences explaining the medical justification for these ratings.
5. firstAidInstructions: A direct, step-by-step simple set of immediate first-aid instructions for the caller while they wait for the ambulance.
6. etaReasoning: A realistic explanation of transit priority, emergency signals speedup, and hospital proximity.

Return the response in a structured JSON object.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING, description: "Must be Critical, High, Moderate, or Low." },
              recommendedAmbulanceType: { type: Type.STRING, description: "Must be ICU, ALS, BLS, or Patient Transport." },
              suggestedHospitalSpecialization: { type: Type.STRING },
              explanation: { type: Type.STRING },
              firstAidInstructions: { type: Type.STRING },
              etaReasoning: { type: Type.STRING }
            },
            required: ["severity", "recommendedAmbulanceType", "suggestedHospitalSpecialization", "explanation", "firstAidInstructions", "etaReasoning"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        aiResults = JSON.parse(responseText.trim());
      }
    } catch (err) {
      console.error("Gemini triage call failed, falling back.", err);
      aiResults = fallbackAnalyzeEmergency(symptoms);
    }
  } else {
    // Local rules fallback
    aiResults = fallbackAnalyzeEmergency(symptoms);
  }

  // Match the recommended hospital from our actual hospital list based on coordinates and specialization!
  // Sort hospitals by suitability: matches specialization first, then sorted by distance.
  const matchedHospitals = hospitals.map(h => {
    // check if hospital matches suggested specialty
    const specLower = aiResults.suggestedHospitalSpecialization.toLowerCase();
    const hasSpecMatch = h.specializations.some(s => specLower.includes(s.toLowerCase()) || s.toLowerCase().includes(specLower));
    
    // distance
    const dist = Math.sqrt(Math.pow(h.x - px, 2) + Math.pow(h.y - py, 2));
    
    return {
      hospital: h,
      distance: dist,
      hasSpecMatch,
      score: (hasSpecMatch ? 100 : 0) - dist // higher score is better match
    };
  }).sort((a, b) => b.score - a.score);

  const bestHospital = matchedHospitals[0]?.hospital || hospitals[0];

  // Match the recommended available ambulance of recommended type closest to pickup
  const filteredAmbulances = ambulances.filter(a => a.status === "available" && a.type === aiResults.recommendedAmbulanceType);
  const pool = filteredAmbulances.length > 0 ? filteredAmbulances : ambulances.filter(a => a.status === "available");
  
  const selectedAmb = pool.map(a => {
    const d = drivers.find(drv => drv.id === a.driverId);
    const ax = d ? d.x : 50;
    const ay = d ? d.y : 50;
    const dist = Math.sqrt(Math.pow(ax - px, 2) + Math.pow(ay - py, 2));
    return { ambulance: a, distance: dist, driver: d };
  }).sort((a, b) => a.distance - b.distance)[0];

  // Compute travel ETA: distance-based. Let's make it 1 grid unit = 0.2 minutes (sirens on) or 0.4 minutes (sirens off)
  const baseDist = selectedAmb ? selectedAmb.distance : 15;
  const speedCoeff = aiResults.severity === "Critical" ? 0.15 : (aiResults.severity === "High" ? 0.22 : 0.35);
  let etaMinutes = Math.max(3, Math.round(baseDist * speedCoeff));

  res.json({
    aiAnalysis: {
      ...aiResults,
      recommendedHospitalId: bestHospital.id,
      recommendedHospitalName: bestHospital.name,
      recommendedAmbulanceId: selectedAmb?.ambulance.id || ambulances[0].id,
      recommendedAmbulancePlate: selectedAmb?.ambulance.plateNumber || ambulances[0].plateNumber,
      recommendedDriverId: selectedAmb?.driver?.id || drivers[0].id,
      recommendedDriverName: selectedAmb?.driver?.name || drivers[0].name,
      estimatedArrivalMinutes: etaMinutes
    }
  });
});

// Bookings CRUD & Custom logic
app.get("/api/bookings", (req, res) => {
  const { patientId, driverId, hospitalId, search, status, severity } = req.query;
  let list = [...bookings];

  if (patientId) {
    list = list.filter(b => b.patientId === patientId);
  }
  if (driverId) {
    list = list.filter(b => b.selectedDriverId === driverId);
  }
  if (hospitalId) {
    list = list.filter(b => b.destinationHospitalId === hospitalId);
  }
  if (status) {
    list = list.filter(b => b.status === status);
  }
  if (severity) {
    list = list.filter(b => b.severity === severity);
  }
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(b =>
      b.patientName.toLowerCase().includes(s) ||
      b.symptoms.toLowerCase().includes(s) ||
      b.pickupLocation.name.toLowerCase().includes(s) ||
      b.id.toLowerCase().includes(s)
    );
  }

  // Sort bookings so Critical/High are on top for drivers and hospital emergency coordinators
  list.sort((a, b) => {
    const severityWeight = { "Critical": 4, "High": 3, "Moderate": 2, "Low": 1 };
    const wA = severityWeight[a.severity] || 0;
    const wB = severityWeight[b.severity] || 0;
    
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    
    // sorting by severity for pending / active
    if (["pending", "accepted", "in-transit"].includes(a.status) && ["pending", "accepted", "in-transit"].includes(b.status)) {
      return wB - wA;
    }
    
    // default sort by date descending
    return new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime();
  });

  res.json(list);
});

app.post("/api/bookings", (req, res) => {
  const {
    patientId,
    patientName,
    patientPhone,
    symptoms,
    severity,
    pickupLocation,
    destinationHospitalId,
    selectedAmbulanceId,
    selectedDriverId,
    estimatedArrivalMinutes,
    aiAnalysis
  } = req.body;

  const newBooking: Booking = {
    id: "bk_" + Math.floor(1000 + Math.random() * 9000),
    patientId: patientId || "usr_patient_1",
    patientName: patientName || "Patient Guest",
    patientPhone: patientPhone || "+1 (555) 999-0000",
    symptoms,
    severity: severity || "Moderate",
    pickupLocation: {
      name: pickupLocation?.name || "Street Location",
      x: pickupLocation?.x || 50,
      y: pickupLocation?.y || 50
    },
    destinationHospitalId: destinationHospitalId || "hosp_1",
    selectedAmbulanceId: selectedAmbulanceId || "amb_1",
    selectedDriverId: selectedDriverId || "drv_1",
    status: "pending",
    bookingTime: new Date().toISOString(),
    estimatedArrivalMinutes: estimatedArrivalMinutes || 10,
    aiAnalysis
  };

  // Find assigned driver starting coords
  const driver = drivers.find(d => d.id === newBooking.selectedDriverId);
  if (driver) {
    newBooking.ambulanceX = driver.x;
    newBooking.ambulanceY = driver.y;
    // set driver availability to false so they don't get double assigned
    driver.available = false;
  }

  // update ambulance status to on-trip
  const ambIdx = ambulances.findIndex(a => a.id === newBooking.selectedAmbulanceId);
  if (ambIdx !== -1) {
    ambulances[ambIdx].status = "on-trip";
  }

  bookings.push(newBooking);
  res.json({ success: true, booking: newBooking });
});

// Update booking status (Driver status toggle, Hospital tracking, Admin)
app.put("/api/bookings/:id", (req, res) => {
  const { id } = req.params;
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return res.status(404).json({ error: "Booking not found" });

  const oldStatus = bookings[index].status;
  bookings[index] = { ...bookings[index], ...req.body };

  // Sync ambulance and driver status on terminal states
  if (req.body.status && req.body.status !== oldStatus) {
    const status = req.body.status as BookingStatus;
    if (status === "completed" || status === "cancelled") {
      // release driver
      const drIdx = drivers.findIndex(d => d.id === bookings[index].selectedDriverId);
      if (drIdx !== -1) {
        drivers[drIdx].available = true;
        // update driver coordinate to destination hospital coordinate
        const hospital = hospitals.find(h => h.id === bookings[index].destinationHospitalId);
        if (hospital) {
          drivers[drIdx].x = hospital.x;
          drivers[drIdx].y = hospital.y;
        }
      }

      // release ambulance
      const ambIdx = ambulances.findIndex(a => a.id === bookings[index].selectedAmbulanceId);
      if (ambIdx !== -1) {
        ambulances[ambIdx].status = "available";
        // consume a bit of fuel
        ambulances[ambIdx].fuelLevel = Math.max(10, ambulances[ambIdx].fuelLevel - Math.floor(5 + Math.random() * 8));
      }
    }
  }

  res.json({ success: true, booking: bookings[index] });
});

// SUBMIT FEEDBACK
app.post("/api/bookings/:id/feedback", (req, res) => {
  const { id } = req.params;
  const { rating, comments } = req.body;
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return res.status(404).json({ error: "Booking not found" });

  bookings[index].feedback = {
    rating: Number(rating) || 5,
    comments: comments || "",
    timestamp: new Date().toISOString()
  };

  // Adjust driver rating
  const driverId = bookings[index].selectedDriverId;
  const drIdx = drivers.findIndex(d => d.id === driverId);
  if (drIdx !== -1) {
    const oldRating = drivers[drIdx].rating;
    drivers[drIdx].rating = Number(((oldRating * 4 + Number(rating)) / 5).toFixed(2));
  }

  res.json({ success: true, booking: bookings[index] });
});

// SIMULATE ACTIVE MOVEMENT (FOR REAL-TIME GPS SIMULATOR)
app.post("/api/bookings/:id/simulate-gps", (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  if (!["accepted", "in-transit", "arrived"].includes(booking.status)) {
    return res.json({ success: false, message: "Booking is not in active state.", booking });
  }

  // Hospital Location
  const hosp = hospitals.find(h => h.id === booking.destinationHospitalId) || hospitals[0];
  // Target coordinates
  let targetX = hosp.x;
  let targetY = hosp.y;

  // If status is accepted, ambulance is driving towards patient pickup location!
  if (booking.status === "accepted") {
    targetX = booking.pickupLocation.x;
    targetY = booking.pickupLocation.y;
  }

  // Current ambulance coordinates (fallback to driver coords if unset)
  let currentX = booking.ambulanceX ?? 30;
  let currentY = booking.ambulanceY ?? 30;

  // Move 10% closer to the target coordinates
  const stepX = (targetX - currentX) * 0.25;
  const stepY = (targetY - currentY) * 0.25;

  currentX += stepX;
  currentY += stepY;

  // Round values
  booking.ambulanceX = Math.round(currentX * 10) / 10;
  booking.ambulanceY = Math.round(currentY * 10) / 10;

  // Auto transition state if close enough!
  const distToTarget = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));
  if (distToTarget < 2) {
    if (booking.status === "accepted") {
      booking.status = "arrived";
      booking.estimatedArrivalMinutes = 0;
    } else if (booking.status === "in-transit") {
      booking.status = "completed";
      
      // trigger final release
      const drIdx = drivers.findIndex(d => d.id === booking.selectedDriverId);
      if (drIdx !== -1) {
        drivers[drIdx].available = true;
        drivers[drIdx].x = hosp.x;
        drivers[drIdx].y = hosp.y;
      }
      const ambIdx = ambulances.findIndex(a => a.id === booking.selectedAmbulanceId);
      if (ambIdx !== -1) {
        ambulances[ambIdx].status = "available";
        ambulances[ambIdx].fuelLevel = Math.max(15, ambulances[ambIdx].fuelLevel - 5);
      }
    }
  } else {
    // reduce ETA slightly
    if (booking.estimatedArrivalMinutes > 1) {
      booking.estimatedArrivalMinutes -= 1;
    }
  }

  res.json({ success: true, booking });
});

// SIMULATE REAL-TIME GPS POOLING IN CLIENT
// VITE AND BINDING SETUP

// Vite middleware for development or build hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
