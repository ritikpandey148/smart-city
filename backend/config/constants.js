// backend/config/constants.js

const ROLES = {
  CITIZEN: 'citizen',
  ADMIN: 'admin',
  PROVIDER: 'provider'
};

const COMPLAINT_STATUS = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved'
};

const COMPLAINT_CATEGORY = {
  GARBAGE: 'garbage',
  POTHOLE: 'pothole',
  OTHERS: 'others'
};

const OBSERVATION = {
  SEEN_DAILY: 'seen_daily',
  FEW_DAYS: 'few_days',
  TODAY_ONLY: 'today_only'
};

const LOCALITIES = [
  "Andheri East","Andheri West","Anushakti Nagar",
  "Bandra East","Bandra West","Bhandup East","Bhandup West",
  "Bhuleshwar","Borivali East","Borivali West","Byculla","Chembur",
  "Churchgate","Colaba","Cuffe Parade","Dadar East","Dadar West",
  "Dahisar","Dharavi","Fort","Ghatkopar East","Ghatkopar West",
  "Girgaon","Goregaon East","Goregaon West","Govandi",
  "Jogeshwari East","Jogeshwari West","Juhu","Kalbadevi",
  "Kandivali East","Kandivali West","Kanjurmarg",
  "Khar East","Khar West","Kurla East","Kurla West",
  "Lower Parel","Madh","Mahalaxmi","Mahim","Malad East","Malad West",
  "Mankhurd","Marine Lines","Marol","Masjid Bunder","Matunga",
  "Mazgaon","Mulund East","Mulund West","Parel","Powai","Prabhadevi",
  "Sakinaka","Santacruz East","Santacruz West","Sion","Tardeo",
  "Trombay","Versova","Vikhroli East","Vikhroli West",
  "Vile Parle East","Vile Parle West","Wadala","Worli"
];

const PINCODES = [
  "400001","400002","400003","400004","400005","400007","400010",
  "400011","400012","400013","400014","400016","400017","400018",
  "400019","400020","400022","400024","400025","400027","400028",
  "400031","400034","400037","400042","400049","400050","400051",
  "400052","400053","400054","400055","400056","400057","400058",
  "400059","400060","400061","400062","400063","400064","400066",
  "400067","400068","400069","400070","400071","400072","400074",
  "400076","400077","400078","400079","400080","400081","400083",
  "400086","400088","400092","400094","400097","400101","400102",
  "400104"
];

module.exports = {
  ROLES,
  COMPLAINT_STATUS,
  COMPLAINT_CATEGORY,
  OBSERVATION,
  LOCALITIES,
  PINCODES
};