// frontend/js/locality.js
// Mumbai localities with their pincodes

const LOCALITY_DATA = [
  // Western Line — East & West
  { name: "Andheri East", pincodes: ["400069"] },
  { name: "Andheri West", pincodes: ["400053", "400058"] },
  { name: "Bandra East", pincodes: ["400051"] },
  { name: "Bandra West", pincodes: ["400050"] },
  { name: "Bhandup East", pincodes: ["400042"] },
  { name: "Bhandup West", pincodes: ["400078"] },
  { name: "Borivali East", pincodes: ["400066"] },
  { name: "Borivali West", pincodes: ["400092"] },
  { name: "Chembur East", pincodes: ["400071", "400074"] },
  { name: "Chembur West", pincodes: ["400071", "400074"] },
  { name: "Dadar East", pincodes: ["400014"] },
  { name: "Dadar West", pincodes: ["400028"] },
  { name: "Dahisar", pincodes: ["400068"] },
  { name: "Ghatkopar East", pincodes: ["400077"] },
  { name: "Ghatkopar West", pincodes: ["400086"] },
  { name: "Goregaon East", pincodes: ["400063"] },
  { name: "Goregaon West", pincodes: ["400062", "400104"] },
  { name: "Jogeshwari East", pincodes: ["400060"] },
  { name: "Jogeshwari West", pincodes: ["400102"] },
  { name: "Kandivali East", pincodes: ["400101"] },
  { name: "Kandivali West", pincodes: ["400067"] },
  { name: "Kanjurmarg East", pincodes: ["400042"] },
  { name: "Kanjurmarg West", pincodes: ["400078"] },
  { name: "Khar East", pincodes: ["400051"] },
  { name: "Khar West", pincodes: ["400052"] },
  { name: "Kurla East", pincodes: ["400024", "400070"] },
  { name: "Kurla West", pincodes: ["400070"] },
  { name: "Malad East", pincodes: ["400097"] },
  { name: "Malad West", pincodes: ["400064"] },
  { name: "Matunga", pincodes: ["400019"] },
  { name: "Mulund East", pincodes: ["400081"] },
  { name: "Mulund West", pincodes: ["400080"] },
  { name: "Santacruz East", pincodes: ["400055"] },
  { name: "Santacruz West", pincodes: ["400054"] },
  { name: "Vikhroli East", pincodes: ["400083", "400079"] },
  { name: "Vikhroli West", pincodes: ["400079"] },
  { name: "Vile Parle East", pincodes: ["400057"] },
  { name: "Vile Parle West", pincodes: ["400056"] },
  { name: "Wadala East", pincodes: ["400037"] },
  { name: "Wadala West", pincodes: ["400031"] },

  // South Mumbai / Island City
  { name: "Anushakti Nagar", pincodes: ["400094"] },
  { name: "Bhuleshwar", pincodes: ["400002"] },
  { name: "Byculla", pincodes: ["400011", "400027"] },
  { name: "Churchgate", pincodes: ["400020"] },
  { name: "Colaba", pincodes: ["400005"] },
  { name: "Cuffe Parade", pincodes: ["400005"] },
  { name: "Dharavi", pincodes: ["400017"] },
  { name: "Fort", pincodes: ["400001"] },
  { name: "Girgaon", pincodes: ["400004"] },
  { name: "Govandi", pincodes: ["400088"] },
  { name: "Juhu", pincodes: ["400049"] },
  { name: "Kalbadevi", pincodes: ["400002"] },
  { name: "Lower Parel", pincodes: ["400013"] },
  { name: "Madh", pincodes: ["400061"] },
  { name: "Mahalaxmi", pincodes: ["400011"] },
  { name: "Mahim", pincodes: ["400016"] },
  { name: "Mankhurd", pincodes: ["400088"] },
  { name: "Marine Lines", pincodes: ["400020"] },
  { name: "Marol", pincodes: ["400059"] },
  { name: "Masjid Bunder", pincodes: ["400003"] },
  { name: "Mazgaon", pincodes: ["400010"] },
  { name: "Parel", pincodes: ["400012"] },
  { name: "Powai", pincodes: ["400076"] },
  { name: "Prabhadevi", pincodes: ["400025"] },
  { name: "Sakinaka", pincodes: ["400072"] },
  { name: "Sion", pincodes: ["400022"] },
  { name: "Tardeo", pincodes: ["400007", "400034"] },
  { name: "Trombay", pincodes: ["400088"] },
  { name: "Versova", pincodes: ["400061"] },
  { name: "Worli", pincodes: ["400018"] }
];

// Sorted list of all localities
const LOCALITIES = LOCALITY_DATA.map(l => l.name).sort();

// Helper: get pincodes for a locality
function getPincodesForLocality(localityName) {
  const item = LOCALITY_DATA.find(l => l.name === localityName);
  return item ? item.pincodes : [];
}

// Helper: get all unique pincodes with locality labels
const ALL_PINCODE_OPTIONS = (() => {
  const map = {};
  LOCALITY_DATA.forEach(loc => {
    loc.pincodes.forEach(pin => {
      if (!map[pin]) map[pin] = [];
      map[pin].push(loc.name);
    });
  });
  return Object.keys(map).sort().map(code => ({
    value: code,
    label: `${code} — ${map[code].slice(0, 2).join(' / ')}`
  }));
})();