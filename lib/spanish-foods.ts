export interface SpanishFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const SPANISH_FOODS: SpanishFood[] = [
  // Desayuno
  { id: "es-001", name: "Tostada con tomate y aceite", calories: 182, protein: 5, carbs: 26, fat: 7 },
  { id: "es-002", name: "Churros", calories: 337, protein: 5, carbs: 52, fat: 12 },
  { id: "es-003", name: "Porras", calories: 320, protein: 5, carbs: 50, fat: 11 },
  { id: "es-004", name: "Magdalena", calories: 390, protein: 6, carbs: 55, fat: 17 },
  { id: "es-005", name: "Pan de molde Bimbo", calories: 258, protein: 9, carbs: 47, fat: 4 },
  { id: "es-006", name: "Tostada con mantequilla y mermelada", calories: 260, protein: 5, carbs: 42, fat: 8 },
  { id: "es-007", name: "Cola Cao con leche entera", calories: 80, protein: 4, carbs: 11, fat: 2 },

  // Pan y bocadillos
  { id: "es-010", name: "Barra de pan (pan de pueblo)", calories: 270, protein: 9, carbs: 54, fat: 1.5 },
  { id: "es-011", name: "Bocadillo de jamón serrano", calories: 235, protein: 16, carbs: 25, fat: 8 },
  { id: "es-012", name: "Bocadillo de tortilla española", calories: 230, protein: 9, carbs: 28, fat: 9 },
  { id: "es-013", name: "Bocadillo de calamares", calories: 255, protein: 12, carbs: 30, fat: 9 },
  { id: "es-014", name: "Bocadillo de lomo con pimientos", calories: 245, protein: 18, carbs: 26, fat: 8 },
  { id: "es-015", name: "Montadito de chorizo", calories: 290, protein: 12, carbs: 28, fat: 14 },

  // Huevos y tortillas
  { id: "es-020", name: "Tortilla española (patata y huevo)", calories: 175, protein: 9, carbs: 14, fat: 9 },
  { id: "es-021", name: "Huevo frito con aceite de oliva", calories: 196, protein: 13, carbs: 0, fat: 16 },
  { id: "es-022", name: "Revuelto de gambas", calories: 155, protein: 14, carbs: 1, fat: 10 },
  { id: "es-023", name: "Revuelto de champiñones", calories: 140, protein: 10, carbs: 3, fat: 10 },

  // Sopas y cremas
  { id: "es-030", name: "Gazpacho andaluz", calories: 32, protein: 1, carbs: 5, fat: 1 },
  { id: "es-031", name: "Salmorejo cordobés", calories: 130, protein: 3, carbs: 12, fat: 8 },
  { id: "es-032", name: "Caldo de pollo", calories: 20, protein: 2, carbs: 1, fat: 0.5 },
  { id: "es-033", name: "Sopa de fideos", calories: 75, protein: 4, carbs: 12, fat: 1.5 },
  { id: "es-034", name: "Crema de calabaza", calories: 55, protein: 1, carbs: 9, fat: 1.5 },

  // Arroz y pasta
  { id: "es-040", name: "Paella valenciana", calories: 180, protein: 10, carbs: 28, fat: 4 },
  { id: "es-041", name: "Paella de marisco", calories: 165, protein: 12, carbs: 25, fat: 3 },
  { id: "es-042", name: "Arroz con pollo", calories: 175, protein: 12, carbs: 22, fat: 4 },
  { id: "es-043", name: "Arroz al horno", calories: 195, protein: 10, carbs: 26, fat: 6 },
  { id: "es-044", name: "Arroz con leche", calories: 140, protein: 4, carbs: 25, fat: 3 },
  { id: "es-045", name: "Fideuà", calories: 175, protein: 11, carbs: 24, fat: 4 },

  // Legumbres
  { id: "es-050", name: "Cocido madrileño", calories: 220, protein: 15, carbs: 20, fat: 8 },
  { id: "es-051", name: "Fabada asturiana", calories: 210, protein: 12, carbs: 22, fat: 8 },
  { id: "es-052", name: "Lentejas estofadas con chorizo", calories: 155, protein: 10, carbs: 20, fat: 4 },
  { id: "es-053", name: "Potaje de garbanzos con espinacas", calories: 160, protein: 9, carbs: 22, fat: 4 },
  { id: "es-054", name: "Alubias blancas estofadas", calories: 140, protein: 9, carbs: 21, fat: 2 },
  { id: "es-055", name: "Judías verdes con patata", calories: 60, protein: 2, carbs: 10, fat: 0.5 },

  // Carnes
  { id: "es-060", name: "Lomo de cerdo a la plancha", calories: 185, protein: 28, carbs: 0, fat: 8 },
  { id: "es-061", name: "Pollo asado al horno", calories: 200, protein: 27, carbs: 0, fat: 10 },
  { id: "es-062", name: "Pechuga de pollo a la plancha", calories: 120, protein: 24, carbs: 0, fat: 2 },
  { id: "es-063", name: "Chuletón de ternera a la plancha", calories: 260, protein: 26, carbs: 0, fat: 17 },
  { id: "es-064", name: "Albóndigas en salsa de tomate", calories: 200, protein: 15, carbs: 8, fat: 12 },
  { id: "es-065", name: "Milanesa de ternera empanada", calories: 240, protein: 22, carbs: 14, fat: 10 },
  { id: "es-066", name: "Conejo al ajillo", calories: 165, protein: 22, carbs: 2, fat: 7 },
  { id: "es-067", name: "Carrilleras de cerdo en salsa", calories: 195, protein: 18, carbs: 5, fat: 11 },

  // Embutidos y charcutería
  { id: "es-070", name: "Jamón serrano", calories: 241, protein: 31, carbs: 0, fat: 13 },
  { id: "es-071", name: "Jamón ibérico", calories: 375, protein: 25, carbs: 0, fat: 31 },
  { id: "es-072", name: "Chorizo curado", calories: 455, protein: 24, carbs: 1, fat: 40 },
  { id: "es-073", name: "Salchichón ibérico", calories: 420, protein: 26, carbs: 0, fat: 35 },
  { id: "es-074", name: "Morcilla de Burgos", calories: 310, protein: 14, carbs: 20, fat: 20 },
  { id: "es-075", name: "Lomo embuchado", calories: 280, protein: 30, carbs: 0, fat: 18 },
  { id: "es-076", name: "Fuet", calories: 430, protein: 27, carbs: 0, fat: 36 },

  // Pescados y mariscos
  { id: "es-080", name: "Merluza a la plancha", calories: 92, protein: 19, carbs: 0, fat: 1.5 },
  { id: "es-081", name: "Bacalao al pil pil", calories: 190, protein: 22, carbs: 2, fat: 10 },
  { id: "es-082", name: "Gambas al ajillo", calories: 150, protein: 18, carbs: 2, fat: 8 },
  { id: "es-083", name: "Pulpo a la gallega", calories: 120, protein: 20, carbs: 3, fat: 3 },
  { id: "es-084", name: "Sardinas a la plancha", calories: 180, protein: 23, carbs: 0, fat: 10 },
  { id: "es-085", name: "Boquerones en vinagre", calories: 145, protein: 18, carbs: 0, fat: 8 },
  { id: "es-086", name: "Calamares a la romana", calories: 225, protein: 14, carbs: 18, fat: 10 },
  { id: "es-087", name: "Rape al horno con verduras", calories: 110, protein: 20, carbs: 4, fat: 2 },
  { id: "es-088", name: "Mejillones al vapor", calories: 86, protein: 12, carbs: 4, fat: 2 },
  { id: "es-089", name: "Anchoas en conserva", calories: 210, protein: 29, carbs: 0, fat: 11 },

  // Tapas y aperitivos
  { id: "es-090", name: "Patatas bravas", calories: 180, protein: 2, carbs: 22, fat: 9 },
  { id: "es-091", name: "Croquetas de jamón", calories: 215, protein: 8, carbs: 20, fat: 11 },
  { id: "es-092", name: "Ensaladilla rusa", calories: 190, protein: 4, carbs: 15, fat: 13 },
  { id: "es-093", name: "Pan con tomate (pa amb tomàquet)", calories: 175, protein: 4, carbs: 28, fat: 5 },
  { id: "es-094", name: "Pimientos del piquillo", calories: 40, protein: 2, carbs: 6, fat: 0.5 },
  { id: "es-095", name: "Aceitunas aliñadas", calories: 145, protein: 1, carbs: 4, fat: 15 },
  { id: "es-096", name: "Berberechos al natural", calories: 76, protein: 15, carbs: 2, fat: 0.5 },
  { id: "es-097", name: "Pisto manchego", calories: 80, protein: 2, carbs: 8, fat: 4 },

  // Verduras y ensaladas
  { id: "es-100", name: "Ensalada mixta", calories: 45, protein: 2, carbs: 5, fat: 2 },
  { id: "es-101", name: "Espinacas a la catalana", calories: 95, protein: 4, carbs: 6, fat: 6 },
  { id: "es-102", name: "Escalivada", calories: 70, protein: 2, carbs: 8, fat: 3 },
  { id: "es-103", name: "Pimientos asados con aceite", calories: 80, protein: 1, carbs: 9, fat: 4 },
  { id: "es-104", name: "Menestra de verduras", calories: 65, protein: 3, carbs: 9, fat: 2 },
  { id: "es-105", name: "Patatas al horno", calories: 155, protein: 3, carbs: 30, fat: 3 },

  // Quesos
  { id: "es-110", name: "Queso manchego curado", calories: 392, protein: 26, carbs: 0, fat: 32 },
  { id: "es-111", name: "Queso manchego semicurado", calories: 360, protein: 25, carbs: 1, fat: 29 },
  { id: "es-112", name: "Queso tetilla", calories: 310, protein: 20, carbs: 1, fat: 25 },
  { id: "es-113", name: "Queso de cabra fresco", calories: 265, protein: 19, carbs: 2, fat: 21 },

  // Postres
  { id: "es-120", name: "Flan de huevo", calories: 130, protein: 5, carbs: 20, fat: 4 },
  { id: "es-121", name: "Crema catalana", calories: 175, protein: 4, carbs: 20, fat: 9 },
  { id: "es-122", name: "Tarta de Santiago", calories: 410, protein: 9, carbs: 48, fat: 22 },
  { id: "es-123", name: "Torrijas", calories: 280, protein: 7, carbs: 38, fat: 11 },
  { id: "es-124", name: "Pestiños", calories: 350, protein: 4, carbs: 45, fat: 18 },
  { id: "es-125", name: "Rosquillas", calories: 380, protein: 6, carbs: 52, fat: 17 },
  { id: "es-126", name: "Natillas caseras", calories: 125, protein: 4, carbs: 18, fat: 4 },
  { id: "es-127", name: "Leche frita", calories: 220, protein: 5, carbs: 30, fat: 9 },

  // Bebidas típicas (sin alcohol)
  { id: "es-130", name: "Horchata de chufa", calories: 68, protein: 1, carbs: 15, fat: 1 },
  { id: "es-131", name: "Zumo de naranja natural", calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function searchSpanishFoods(query: string): SpanishFood[] {
  const q = normalize(query);
  return SPANISH_FOODS.filter((f) => normalize(f.name).includes(q));
}
