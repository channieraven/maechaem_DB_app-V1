
import { TreeRecord, SpeciesInfo, PlantCategory } from '../types';

export const getPlantCategory = (speciesName: string, speciesGroup: string): PlantCategory => {
  if (!speciesName) return 'ไม้ป่า'; // Default
  
  const name = speciesName.toLowerCase();

  if (name.includes('ยางพารา')) return 'ยางพารา';
  if (name.includes('ไผ่')) return 'ผลผลิตไผ่';
  if (name.includes('กล้วย')) return 'กล้วย';
  
  // Logic for others
  if (speciesGroup === 'B') return 'ไม้ผล';
  
  return 'ไม้ป่า'; // Default for Group A (Forest)
};

export const getCategoryFromRecord = (record: TreeRecord): PlantCategory => {
  return getPlantCategory(record.species_name, record.species_group);
};

export const getCategoryFromInfo = (info: SpeciesInfo): PlantCategory => {
  return getPlantCategory(info.name, info.group);
};

export const getCategoryColor = (category: PlantCategory) => {
  switch (category) {
    case 'ไม้ป่า': return 'bg-green-100 text-green-800 border-green-200';
    case 'ยางพารา': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ผลผลิตไผ่': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ไม้ผล': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'กล้วย': return 'bg-lime-100 text-lime-800 border-lime-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};
