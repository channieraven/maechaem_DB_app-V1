
export interface TreeRecord {
  id: number;
  log_id?: string;
  tree_code: string;
  tag_label: string;
  plot_code: string;
  species_code: string;
  species_group: 'A' | 'B';
  species_name: string;
  tree_number: number;
  row_main: string;
  row_sub: string;
  
  // Common Measurements
  height_m: string | number | null;
  status: 'alive' | 'dead' | null;
  flowering: 'yes' | 'no' | null; // การติดดอกออกผล
  note: string;
  recorder: string;
  survey_date: string;
  timestamp: string;

  // Specific: Forest / Rubber / Fruit
  dbh_cm: string | number | null;

  // Specific: Bamboo
  bamboo_culms: string | number | null; // จำนวนลำ
  dbh_1_cm: string | number | null;
  dbh_2_cm: string | number | null;
  dbh_3_cm: string | number | null;

  // Specific: Banana
  banana_total: string | number | null; // จำนวนต้นทั้งหมด
  banana_1yr: string | number | null;   // จำนวนต้น 1 ปี
  yield_bunches: string | number | null; // เครือ
  yield_hands: string | number | null;   // หวี
  price_per_hand: string | number | null; // ราคาต่อหวี
}

export interface CoordRecord {
  tree_code: string;
  tag_label?: string;
  plot_code: string;
  species_code?: string;
  species_group?: string;
  species_name?: string;
  tree_number?: string | number;
  row_main?: string;
  row_sub?: string;
  utm_x: number | string | null;
  utm_y: number | string | null;
  lat: number | string | null;
  lng: number | string | null;
  note?: string;
}

export interface SpeciesInfo {
  code: string;
  name: string;
  group: 'A' | 'B';
}

export interface GrowthFormData {
  plotCode: string;
  treeNumber: string;
  speciesCode: string;
  rowMain: string;
  rowSub: string;
  
  // Common
  heightM: string;
  status: 'alive' | 'dead' | null;
  flowering: 'yes' | 'no' | null;
  note: string;
  recorder: string;
  surveyDate: string;

  // Standard (Forest/Rubber/Fruit)
  dbhCm: string;

  // Bamboo
  bambooCulms: string;
  dbh1Cm: string;
  dbh2Cm: string;
  dbh3Cm: string;

  // Banana
  bananaTotal: string;
  banana1yr: string;
  yieldBunches: string;
  yieldHands: string;
  pricePerHand: string;
}

export type GalleryCategory = 'tree' | 'soil' | 'atmosphere' | 'other';

export interface PlotImage {
  id: string;
  plotCode: string;
  // Updated types to support 2 pre-plans and 1 post-plan
  type: 'plan_pre_1' | 'plan_pre_2' | 'plan_post_1' | 'gallery' | 'plan_pre'; // keep plan_pre for backward compatibility if needed
  galleryCategory?: GalleryCategory; // only relevant when type === 'gallery'
  url: string;
  description?: string;
  uploader?: string;
  date?: string;
  upload_timestamp?: string; // exact server-side timestamp when the file was uploaded
}

export type ViewType = 'table' | 'coords' | 'map' | 'stats' | 'history' | 'plotInfo' | 'profile';
export type PlantCategory = 'ไม้ป่า' | 'ยางพารา' | 'ผลผลิตไผ่' | 'ไม้ผล' | 'กล้วย';
