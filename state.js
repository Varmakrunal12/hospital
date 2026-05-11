// ================================================================
// state.js — Global Application State & Constants
// ================================================================

const DEMO_OTP = '123456';

const DEMO_USERS = {
  'patient@demo.com': {
    uid:'demo-patient-001', role:'patient',
    firstName:'Rahul', lastName:'Verma',
    email:'patient@demo.com', aadhaar:'1234 5678 9012',
    bloodGroup:'O+', age:28, weight:72, height:175, phone:'+91 98765 43210',
    allergies:['Penicillin','Aspirin'],
    emergencyName:'Sunita Verma (Mother)', emergencyPhone:'+91 98765 43210',
    specialization:'',
    reports:[
      {id:'r1',name:'CBC Blood Test',category:'lab',date:'2024-11-10',hospital:'City Diagnostics',notes:'All parameters normal. Hemoglobin: 13.5 g/dL',imageUrl:'',addedBy:'patient'},
      {id:'r2',name:'Chest X-Ray',category:'imaging',date:'2024-09-15',hospital:'Apollo Hospital',notes:'Lungs clear. No abnormalities.',imageUrl:'',addedBy:'patient'},
      {id:'r3',name:'Urine Test',category:'lab',date:'2024-07-22',hospital:'City Lab',notes:'Routine test, all normal.',imageUrl:'',addedBy:'patient'},
    ],
    prescriptions:[
      {id:'rx1',date:'2024-11-12',doctor:'Dr. Amit Sharma',doctorId:'demo-doctor-001',indication:'For fever and body ache',
       medicines:[{name:'Paracetamol 500mg',dosage:'500mg',frequency:'Thrice daily',duration:'3 days',timing:'After meals'}],notes:'Rest well, drink fluids'},
      {id:'rx2',date:'2024-08-05',doctor:'Dr. Priya Singh',doctorId:'demo-doctor-002',indication:'For seasonal allergies',
       medicines:[{name:'Cetirizine 10mg',dosage:'10mg',frequency:'Once daily',duration:'7 days',timing:'At bedtime'}],notes:'Avoid allergens'},
    ],
  },
  'doctor@demo.com': {
    uid:'demo-doctor-001', role:'doctor',
    firstName:'Amit', lastName:'Sharma',
    email:'doctor@demo.com', aadhaar:'9876 5432 1012',
    bloodGroup:'A+', age:40, weight:78, height:178, phone:'+91 99001 12233',
    allergies:[], emergencyName:'', emergencyPhone:'',
    specialization:'General Physician',
    license:'MCI-456789', certificateUrl:'',
    reports:[], prescriptions:[],
  }
};

const MEDICINE_LIST = [
  'Paracetamol 500mg','Amoxicillin 500mg','Metformin 500mg','Atorvastatin 10mg',
  'Omeprazole 20mg','Cetirizine 10mg','Amlodipine 5mg','Metoprolol 50mg',
  'Pantoprazole 40mg','Azithromycin 500mg','Doxycycline 100mg','Ibuprofen 400mg',
  'Aspirin 75mg','Clopidogrel 75mg','Losartan 50mg','Enalapril 5mg',
  'Salbutamol Inhaler','Montelukast 10mg','Pregabalin 75mg','Gabapentin 300mg',
  'Ranitidine 150mg','Domperidone 10mg','Ondansetron 4mg','Loperamide 2mg',
  'Vitamin D3 60000IU','Vitamin B12 1500mcg','Iron + Folic Acid','Calcium 500mg',
  'Metronidazole 400mg','Ciprofloxacin 500mg','Clindamycin 300mg','Fluconazole 150mg',
];

const ALLERGY_MEDICINE_MAP = {
  'Penicillin': ['amoxicillin','ampicillin','penicillin','cloxacillin'],
  'Aspirin':    ['aspirin','ibuprofen','naproxen','diclofenac','ketorolac'],
  'Sulfa':      ['sulfamethoxazole','sulfadiazine','trimethoprim'],
  'Codeine':    ['codeine','morphine','tramadol','oxycodone'],
  'Latex':      [],
  'Nuts':       [],
};

// Central application state
const STATE = {
  currentUser:      null,
  userData:         null,
  userRole:         'patient',
  currentOTP:       null,
  pendingRegData:   null,
  pendingLoginData: null,
  notifications:    [],
  unreadNotif:      0,
  timelineFilter:   'all',
  filterCategory:   'all',
  rxMedicines:      [],
  rxSelectedPatient:null,
  allPatients:      [],
};
