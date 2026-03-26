export const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

export const LISTA_BARRIOS = [
  "Santa Clara", "San José Obrero", "San Juan", "San Antonio", "San Rafael",
  "Las Mercedes", "San Roque", "San Damián", "Santa Rosa", "San Sebastián",
  "San Francisco", "San Isidro", "Sagrado Corazón de Jesús", "San Miguel",
  "San Lorenzo", "San Jorge", "Santo Domingo", "San Pablo",
  "Fray Luis de Bolaños", "Fátima 1", "Santo Tomás", "Area 5", "CONAVI",
  "Centro", "María Auxiliadora", "Caacupe-mí", "Kilómetro 7 Monday", "Tres Fronteras", "San Miguel vila baja",
  "Kilómetro 8 Monday", "Kilómetro 9 Monday", "Kilómetro 10 Monday",
  "Colonia Alfredo Pla", "Península", "Puerto Bertoni", "otros...."
];