/**
 * ============================================================
 * NET-ZERO SUPPLY CHAIN GREEN CORRIDORS DASHBOARD
 * Final integrated version
 * ============================================================
 */

// ===============================
// 1. DATASETS
// ===============================
var no2_col = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2")
  .select('NO2_column_number_density');

var viirs_col = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
  .select('avg_rad');

var ndvi_col = ee.ImageCollection("MODIS/061/MOD13A2")
  .select('NDVI');

var lst_col = ee.ImageCollection("MODIS/061/MOD11A2")
  .select('LST_Day_1km');

// Main period
var no2_2026 = no2_col
  .filterDate('2026-01-01', '2026-03-28')
  .mean();

var viirs_2026 = viirs_col
  .filterDate('2025-06-01', '2026-03-28')
  .median();

var ndvi_2026 = ndvi_col
  .filterDate('2026-01-01', '2026-03-28')
  .mean()
  .multiply(0.0001)
  .rename('NDVI');

var lst_2026 = lst_col
  .filterDate('2026-01-01', '2026-03-28')
  .mean()
  .multiply(0.02)
  .subtract(273.15)
  .rename('LST');

// ===============================
// 2. MAP INSTANCE
// ===============================
var mapPanel = ui.Map();
mapPanel.setOptions('HYBRID');
mapPanel.setCenter(0, 20, 2);
mapPanel.style().set({
  cursor: 'crosshair'
});

// ===============================
// 3. COLORS
// ===============================
var COLORS = {
  dark: '#0E2433',
  navy: '#173F5F',
  teal: '#1F7A8C',
  green: '#2E8B57',
  mint: '#EAF7F2',
  sand: '#F7FAF8',
  light: '#FFFFFF',
  border: '#D7E7DF',
  accent: '#2C7DA0',
  gold: '#D9A441',
  danger: '#C94C4C',
  warning: '#D98E04',
  success: '#3A7D44',
  text: '#24343C',
  softText: '#60717A'
};

// ===============================
// 4. HELPERS
// ===============================
function sectionTitle(text) {
  return ui.Label(text, {
    fontWeight: 'bold',
    fontSize: '18px',
    color: COLORS.navy,
    backgroundColor: 'rgba(0,0,0,0)', // Fondo transparente
    margin: '0 0 10px 0'
  });
}

function bodyText(text) {
  return ui.Label(text, {
    fontSize: '13px',
    color: COLORS.text,
    backgroundColor: 'rgba(0,0,0,0)', // Fondo transparente
    whiteSpace: 'pre-wrap',
    margin: '0 0 8px 0'
  });
}

function bulletText(text) {
  return ui.Label('• ' + text, {
    fontSize: '13px',
    color: COLORS.text,
    whiteSpace: 'pre-wrap',
    margin: '0 0 6px 0'
  });
}

function legendRow(color, text) {
  var colorBox = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '0 8px 4px 0',
    border: '1px solid #888'
  });

  var label = ui.Label(text, {
    fontSize: '13px',
    color: COLORS.text,
    margin: '0 0 4px 0'
  });

  return ui.Panel([colorBox, label], ui.Panel.Layout.Flow('horizontal'));
}

function cardPanel(customColor) { 
  return ui.Panel({
    style: {
      backgroundColor: customColor || COLORS.light, // Ahora sí reconocerá el color
      padding: '14px',
      margin: '0 0 14px 0',
      border: '1px solid ' + COLORS.border
    }
  });
}

function showResult(title, statusText, statusColor, valueText, recommendationText) {
  clickInfoPanel.clear();
  clickInfoPanel.add(sectionTitle('Click diagnosis'));
  clickInfoPanel.add(ui.Label(title, {
    fontWeight: 'bold',
    color: COLORS.navy
  }));
  clickInfoPanel.add(ui.Label(statusText, {
    color: statusColor,
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '6px 0'
  }));
  clickInfoPanel.add(bodyText(valueText));
  clickInfoPanel.add(bodyText('Interpretation: ' + recommendationText));
}

function makeMonthlyCollection(baseCollection, bandName, startDate, endDate, scaleFactor, offsetValue) {
  var start = ee.Date(startDate);
  var end = ee.Date(endDate);
  var months = ee.List.sequence(0, end.difference(start, 'month').subtract(1));

  return ee.ImageCollection.fromImages(
    months.map(function(m) {
      var s = start.advance(m, 'month');
      var e = s.advance(1, 'month');

      var img = baseCollection.filterDate(s, e).mean();

      if (scaleFactor !== null) {
        img = img.multiply(scaleFactor);
      }
      if (offsetValue !== null) {
        img = img.add(offsetValue);
      }

      return img.rename(bandName).set('system:time_start', s.millis());
    })
  );
}

function addChartToPanel(chart, titleText) {
  chartPanel.clear();
  chartPanel.add(sectionTitle('Charts'));
  chartPanel.add(bodyText(titleText));
  chartPanel.add(chart);
}

// ===============================
// 5. LAYER CONFIG
// ===============================
function getLayerConfig(type) {
  if (type === 'NO2') {
    return {
      image: no2_2026,
      vis: {
        min: 0,
        max: 0.00012,
        palette: ['081d58', '225ea8', '41b6c4', 'fecc5c', 'e31a1c']
      }
    };
  } else if (type === 'VIIRS') {
    return {
      image: viirs_2026,
      vis: {
        min: 0,
        max: 20,
        palette: ['0b0b0b', '3f007d', '2b8cbe', 'a6bddb', 'ffffcc']
      }
    };
  } else if (type === 'NDVI') {
    return {
      image: ndvi_2026,
      vis: {
        min: 0,
        max: 1,
        palette: ['8c510a', 'd8b365', 'a6d96a', '1a9850']
      }
    };
  } else if (type === 'LST') {
    return {
      image: lst_2026,
      vis: {
        min: 15,
        max: 40,
        palette: ['2c7bb6', '00ccff', 'ffff8c', 'fdae61', 'd7191c']
      }
    };
  }
}

// ===============================
// 6. MAIN PANELS (CORREGIDO)
// ===============================
var sidePanel = ui.Panel({
  style: {
    width: '430px',
    padding: '14px',
    backgroundColor: COLORS.sand
  }
});

var headerPanel = ui.Panel({
  style: {
    backgroundColor: COLORS.dark, // Asegura el fondo azul muy oscuro
    padding: '0',
    margin: '0 0 14px 0',
    border: '2px solid ' + COLORS.teal // Añade un borde sutil para definirlo
  }
});

var headerTop = ui.Panel({
  style: {
    backgroundColor: COLORS.dark, // Refuerza el fondo oscuro
    padding: '20px 18px 12px 18px'
  }
});

var titleLabel = ui.Label('Net-Zero Green Corridors', {
  fontSize: '26px', // Ajustado para que no se corte
  fontWeight: 'bold',
  color: COLORS.light, // Blanco puro
  margin: '0 0 4px 0',
  backgroundColor: 'rgba(0,0,0,0)' // Fondo transparente para heredar el oscuro
});

var subtitleLabel = ui.Label('Supply Chain Track', {
  fontSize: '14px',
  color: '#D8ECE8', // Color menta claro
  backgroundColor: 'rgba(0,0,0,0)',
  margin: '0'
});

var headerBand = ui.Panel({
  style: {
    backgroundColor: COLORS.teal, // Color turquesa de la imagen
    padding: '10px 18px'
  }
});

var headerBandText = ui.Label(
  'Satellite intelligence for carbon pressure, logistics intensity, vegetation support, and thermal stress',
  {
    fontSize: '12px',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0)',
    margin: '0'
  }
);

headerTop.add(titleLabel);
headerTop.add(subtitleLabel);
headerBand.add(headerBandText);
headerPanel.add(headerTop);
headerPanel.add(headerBand);

// Welcome / intro (BLOQUE REEMPLAZADO)
var introPanel = cardPanel(COLORS.mint); // Aquí asignamos el color menta directamente 

introPanel.add(sectionTitle('Welcome'));
introPanel.add(bodyText(
  'This dashboard supports the interpretation of green corridors for a net-zero supply chain using satellite-based variables related to carbon pressure, economic activity, vegetation cover, and land surface temperature.'
));
introPanel.add(bodyText(
  'Use the layers to compare environmental pressure and logistics intensity across territories, ports, industrial zones, and trade-linked regions.'
));
introPanel.add(bodyText(
  'How to use:\n' +
  '1. Select a variable.\n' +
  '2. Adjust layer opacity.\n' +
  '3. Click on any point on the map.\n' +
  '4. Review the diagnosis, preview, charts, route prototype, and export tools.'
));

// Controls
var controlsPanel = cardPanel();
controlsPanel.style().set({
  backgroundColor: '#FDFEFE'
});
controlsPanel.add(sectionTitle('Dashboard controls'));

var selectLabel = ui.Label('Variable / Layer', {
  fontWeight: 'bold',
  fontSize: '13px',
  color: COLORS.navy,
  margin: '0 0 6px 0'
});

var opacityLabel = ui.Label('Opacity', {
  fontWeight: 'bold',
  fontSize: '13px',
  color: COLORS.navy,
  margin: '8px 0 6px 0'
});

var opacityValueLabel = ui.Label('0.70', {
  color: COLORS.teal,
  fontWeight: 'bold',
  margin: '0 0 0 10px'
});

var variableInfoPanel = cardPanel();
var legendPanel = cardPanel();
var routePanel = cardPanel();
var clickInfoPanel = cardPanel();
var previewPanel = cardPanel();
var chartPanel = cardPanel();
var exportPanel = cardPanel();

var lastClickedPoint = null;
var lastDiagnosticFeature = null;

var selectCapa = ui.Select({
  items: ['NO2', 'VIIRS', 'NDVI', 'LST'],
  value: 'NO2',
  style: {
    width: '180px',
    margin: '0 0 10px 0'
  },
  onChange: function(val) {
    updateMap(val, opacitySlider.getValue());
    updateVariableInfo(val);
    updateLegend(val);
    updatePreview(val);
    resetClickPanel();
  }
});

var opacitySlider = ui.Slider({
  min: 0,
  max: 1,
  value: 0.7,
  step: 0.05,
  style: {stretch: 'horizontal'},
  onChange: function(val) {
    opacityValueLabel.setValue(Number(val).toFixed(2));
    updateMap(selectCapa.getValue(), val);
  }
});

controlsPanel.add(selectLabel);
controlsPanel.add(selectCapa);
controlsPanel.add(opacityLabel);
controlsPanel.add(ui.Panel([
  opacitySlider,
  opacityValueLabel
], ui.Panel.Layout.Flow('horizontal')));

// ===============================
// 7. VARIABLE INFORMATION
// ===============================
function updateVariableInfo(type) {
  variableInfoPanel.clear();
  variableInfoPanel.add(sectionTitle('Variable information'));

  if (type === 'NO2') {
    variableInfoPanel.add(ui.Label('NO2 - Carbon pressure', {
      fontWeight: 'bold',
      color: COLORS.navy
    }));
    variableInfoPanel.add(bulletText('Measures atmospheric nitrogen dioxide associated with combustion, freight movement, port operations, and industrial intensity.'));
    variableInfoPanel.add(bulletText('Useful for identifying pollution pressure in logistics corridors and trade-linked infrastructure.'));
    variableInfoPanel.add(bulletText('High values indicate stronger emissions pressure and higher urgency for decarbonization.'));
  } else if (type === 'VIIRS') {
    variableInfoPanel.add(ui.Label('VIIRS - Economic and logistics activity', {
      fontWeight: 'bold',
      color: COLORS.navy
    }));
    variableInfoPanel.add(bulletText('Measures nighttime light intensity as a proxy for human, industrial, urban, and logistics activity.'));
    variableInfoPanel.add(bulletText('Useful for locating active hubs, industrial clusters, port systems, and high-intensity trade corridors.'));
    variableInfoPanel.add(bulletText('High values usually indicate stronger economic and logistics concentration.'));
  } else if (type === 'NDVI') {
    variableInfoPanel.add(ui.Label('NDVI - Vegetation cover', {
      fontWeight: 'bold',
      color: COLORS.navy
    }));
    variableInfoPanel.add(bulletText('Measures vegetation greenness and land cover condition.'));
    variableInfoPanel.add(bulletText('Useful for understanding ecological support, landscape quality, and environmental resilience around a corridor.'));
    variableInfoPanel.add(bulletText('High values indicate stronger vegetation cover; low values suggest urbanization, bare land, or degradation.'));
  } else if (type === 'LST') {
    variableInfoPanel.add(ui.Label('LST - Land surface temperature', {
      fontWeight: 'bold',
      color: COLORS.navy
    }));
    variableInfoPanel.add(bulletText('Measures surface thermal behavior.'));
    variableInfoPanel.add(bulletText('Useful for detecting heat islands and thermal stress in urban, industrial, and logistics-intensive zones.'));
    variableInfoPanel.add(bulletText('High values may indicate stronger environmental and thermal stress.'));
  }
}

// ===============================
// 8. LEGEND
// ===============================
function updateLegend(type) {
  legendPanel.clear();
  legendPanel.add(sectionTitle('Legend'));

  if (type === 'NO2') {
    legendPanel.add(legendRow('#081d58', 'Very low'));
    legendPanel.add(legendRow('#225ea8', 'Low'));
    legendPanel.add(legendRow('#41b6c4', 'Moderate'));
    legendPanel.add(legendRow('#fecc5c', 'High'));
    legendPanel.add(legendRow('#e31a1c', 'Critical'));
  } else if (type === 'VIIRS') {
    legendPanel.add(legendRow('#0b0b0b', 'No activity'));
    legendPanel.add(legendRow('#3f007d', 'Low activity'));
    legendPanel.add(legendRow('#2b8cbe', 'Moderate activity'));
    legendPanel.add(legendRow('#a6bddb', 'High activity'));
    legendPanel.add(legendRow('#ffffcc', 'Very high activity'));
  } else if (type === 'NDVI') {
    legendPanel.add(legendRow('#8c510a', 'Very low vegetation'));
    legendPanel.add(legendRow('#d8b365', 'Low vegetation'));
    legendPanel.add(legendRow('#a6d96a', 'Moderate vegetation'));
    legendPanel.add(legendRow('#1a9850', 'High vegetation'));
  } else if (type === 'LST') {
    legendPanel.add(legendRow('#2c7bb6', 'Cool'));
    legendPanel.add(legendRow('#00ccff', 'Mild'));
    legendPanel.add(legendRow('#ffff8c', 'Warm'));
    legendPanel.add(legendRow('#fdae61', 'Hot'));
    legendPanel.add(legendRow('#d7191c', 'Extreme heat'));
  }
}

// ===============================
// 9. PREVIEW
// ===============================
function updatePreview(type) {
  previewPanel.clear();
  previewPanel.add(sectionTitle('Preview / visual interpretation'));

  var cfg = getLayerConfig(type);

  var region;
  if (lastClickedPoint !== null) {
    region = lastClickedPoint.buffer(150000).bounds();
  } else {
    region = ee.Geometry.Rectangle([-90, -20, -70, 5]);
  }

  var thumb = ui.Thumbnail({
    image: cfg.image.clip(region).visualize(cfg.vis),
    params: {
      region: region,
      dimensions: 340,
      format: 'png'
    },
    style: {
      width: '340px',
      height: '180px',
      margin: '8px 0'
    }
  });

  previewPanel.add(thumb);

  if (type === 'NO2') {
    previewPanel.add(bodyText(
      'Interpretation: warmer colors indicate stronger carbon pressure around the selected logistics environment.'
    ));
  } else if (type === 'VIIRS') {
    previewPanel.add(bodyText(
      'Interpretation: brighter areas indicate stronger economic and logistics intensity near the selected node.'
    ));
  } else if (type === 'NDVI') {
    previewPanel.add(bodyText(
      'Interpretation: greener tones indicate stronger vegetation cover and better ecological support around the selected area.'
    ));
  } else if (type === 'LST') {
    previewPanel.add(bodyText(
      'Interpretation: warmer colors indicate stronger surface heat stress near the selected logistics zone.'
    ));
  }
}

// ===============================
// 10. MAP
// ===============================
function updateMap(type, opacity) {
  mapPanel.layers().reset();
  var cfg = getLayerConfig(type);
  mapPanel.addLayer(cfg.image, cfg.vis, type, true, opacity);
}

// ===============================
// 11. RESET CLICK PANEL
// ===============================
function resetClickPanel() {
  clickInfoPanel.clear();
  clickInfoPanel.add(sectionTitle('Click diagnosis'));
  clickInfoPanel.add(bodyText('Click on the map to inspect the selected variable at a specific location.'));
  chartPanel.clear();
  chartPanel.add(sectionTitle('Charts'));
  chartPanel.add(bodyText('A trend chart for the selected variable will appear here after clicking on the map.'));
}

// ===============================
// 12. ROUTE PROTOTYPE & NETZERO VERDICT (SpaceHACK-Team100)
// ===============================
routePanel.add(sectionTitle('Green route prototype'));
routePanel.add(bodyText(
  'Prototype: choose an origin and destination hub. The route minimizes logistics distance plus environmental penalty.'
));

// Definimos el contenedor del veredicto como un PANEL para permitir diseño dinámico
var routeResultLabel = ui.Panel({
  style: {
    backgroundColor: COLORS.mint, // Fondo verde menta para resaltar sostenibilidad
    padding: '12px', 
    border: '1px solid ' + COLORS.border,
    margin: '10px 0',
    shown: true
  }
});

var logisticsNodes = {
  'Guayaquil': {lon: -79.8891, lat: -2.1894},
  'Panama': {lon: -79.5167, lat: 8.9833},
  'Miami': {lon: -80.1918, lat: 25.7617},
  'Cartagena': {lon: -75.4794, lat: 10.3910},
  'Callao': {lon: -77.1500, lat: -12.0500},
  'Santos': {lon: -46.3289, lat: -23.9608}
};

var logisticsEdges = [
  ['Guayaquil', 'Panama'], ['Guayaquil', 'Callao'],
  ['Panama', 'Miami'], ['Panama', 'Cartagena'],
  ['Cartagena', 'Miami'], ['Callao', 'Santos'],
  ['Cartagena', 'Santos'], ['Panama', 'Santos']
];

var originSelect = ui.Select({
  items: Object.keys(logisticsNodes),
  value: 'Guayaquil',
  style: {stretch: 'horizontal'}
});

var destinationSelect = ui.Select({
  items: Object.keys(logisticsNodes),
  value: 'Miami',
  style: {stretch: 'horizontal'}
});

function euclideanDistance(a, b) {
  var dx = a.lon - b.lon;
  var dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPenaltyForLayer(layerName) {
  if (layerName === 'NO2') return 1.8;
  if (layerName === 'VIIRS') return 1.2;
  if (layerName === 'NDVI') return 0.8;
  if (layerName === 'LST') return 1.4;
  return 1.0;
}

function buildGraphForLayer(layerName) {
  var penalty = getPenaltyForLayer(layerName);
  var graph = {};
  Object.keys(logisticsNodes).forEach(function(name) { graph[name] = []; });
  logisticsEdges.forEach(function(edge) {
    var a = edge[0]; var b = edge[1];
    var dist = euclideanDistance(logisticsNodes[a], logisticsNodes[b]);
    var cost = dist * penalty;
    graph[a].push({node: b, cost: cost});
    graph[b].push({node: a, cost: cost});
  });
  return graph;
}

function dijkstra(graph, start, end) {
  var distances = {}; var previous = {}; var unvisited = [];
  Object.keys(graph).forEach(function(node) {
    distances[node] = Infinity; previous[node] = null; unvisited.push(node);
  });
  distances[start] = 0;
  while (unvisited.length > 0) {
    unvisited.sort(function(a, b) { return distances[a] - distances[b]; });
    var current = unvisited.shift();
    if (current === end) break;
    graph[current].forEach(function(neighbor) {
      var alt = distances[current] + neighbor.cost;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
      }
    });
  }
  var path = []; var currentNode = end;
  while (currentNode !== null) { path.unshift(currentNode); currentNode = previous[currentNode]; }
  return { path: path, totalCost: distances[end] };
}

function drawRoute(path) {
  var lineCoords = path.map(function(name) { return [logisticsNodes[name].lon, logisticsNodes[name].lat]; });
  var line = ee.Geometry.LineString(lineCoords);
  mapPanel.layers().add(ui.Map.Layer(line, {color: 'yellow', width: 3}, 'Prototype route'));
}

var routeButton = ui.Button({
  label: 'Generate lower-cost route',
  style: { stretch: 'horizontal', border: '1px solid #999', fontWeight: 'bold' },
  onClick: function() {
    var origin = originSelect.getValue();
    var destination = destinationSelect.getValue();

    if (origin === destination) {
      routeResultLabel.clear();
      routeResultLabel.add(ui.Label('⚠️ Origin and destination must be different.', {color: COLORS.danger, backgroundColor: 'rgba(0,0,0,0)'}));
      return;
    }

    var activeLayer = selectCapa.getValue();
    var graph = buildGraphForLayer(activeLayer);
    var result = dijkstra(graph, origin, destination);

    updateMap(activeLayer, opacitySlider.getValue());
    drawRoute(result.path);

    // --- LÓGICA DE IMPACTO NETZERO ---
    var distKM = result.totalCost * 111; // Conversión aproximada para escala de mapa
    var cargaTon = 5; 
    
    // Cálculos de Emisión (g CO2 / ton-km)
    var emAvion = (distKM * cargaTon * 500) / 1000;
    var emBarco = (distKM * cargaTon * 21) / 1000;
    var ahorro = emAvion - emBarco;

    // Actualización dinámica del Veredicto en el Panel
    routeResultLabel.clear();
    routeResultLabel.add(ui.Label('🏆 NETZERO VERDICT', {fontWeight: 'bold', color: COLORS.navy, fontSize: '16px', backgroundColor: 'rgba(0,0,0,0)'}));
    routeResultLabel.add(ui.Label('Best Mode: Barco (Container)', {fontWeight: 'bold', color: COLORS.success, backgroundColor: 'rgba(0,0,0,0)'}));
    routeResultLabel.add(ui.Label('🌿 Ahorro: ' + ahorro.toFixed(2) + ' kg CO2 (vs Avión)', {fontSize: '13px', color: COLORS.teal, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}));
    
    // Sugerencias Dinámicas
    routeResultLabel.add(ui.Label('🛠️ IMPROVEMENTS:', {fontWeight: 'bold', fontSize: '12px', margin: '8px 0 2px 0', backgroundColor: 'rgba(0,0,0,0)'}));
    routeResultLabel.add(ui.Label('• Prioritize Bio-fuels for last-mile delivery.', {fontSize: '11px', color: COLORS.softText, backgroundColor: 'rgba(0,0,0,0)'}));
    routeResultLabel.add(ui.Label('• Optimize schedule to avoid peak NO2 hours.', {fontSize: '11px', color: COLORS.softText, backgroundColor: 'rgba(0,0,0,0)'}));
    
    if (distKM < 600) {
      routeResultLabel.add(ui.Label('⚠️ Note: Air transport is 20x more impactful in short distances.', {fontSize: '10px', color: COLORS.danger, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}));
    }
  }
});

routePanel.add(ui.Label('Origin', {fontWeight: 'bold', color: COLORS.navy, backgroundColor: 'rgba(0,0,0,0)'}));
routePanel.add(originSelect);
routePanel.add(ui.Label('Destination', {fontWeight: 'bold', color: COLORS.navy, margin: '8px 0 0 0', backgroundColor: 'rgba(0,0,0,0)'}));
routePanel.add(destinationSelect);
routePanel.add(routeButton);
routePanel.add(routeResultLabel);

// ===============================
// 13. EXPORT TOOLS
// ===============================
exportPanel.add(sectionTitle('Export tools'));

var exportInfo = bodyText('Export the latest clicked diagnosis as CSV.');
var exportButton = ui.Button({
  label: 'Export clicked diagnosis CSV',
  style: {
    stretch: 'horizontal',
    border: '1px solid #999',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '4px'
  },
  onClick: function() {
    if (lastDiagnosticFeature === null) {
      print('No clicked diagnosis available yet.');
      return;
    }

    var fc = ee.FeatureCollection([lastDiagnosticFeature]);
    Export.table.toDrive({
      collection: fc,
      description: 'clicked_diagnosis_export',
      fileFormat: 'CSV'
    });
    print('CSV export task created: clicked_diagnosis_export');
  }
});

exportPanel.add(exportInfo);
exportPanel.add(exportButton);

// ===============================
// 14. MAP CLICK
// ===============================
mapPanel.onClick(function(coords) {
  var point = ee.Geometry.Point([coords.lon, coords.lat]);
  lastClickedPoint = point;

  var layer = selectCapa.getValue();

  updatePreview(layer);
  chartPanel.clear();
  chartPanel.add(sectionTitle('Charts'));

  if (layer === 'NO2') {
    var no2Value = no2_2026.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: point,
      scale: 1113,
      maxPixels: 1e9
    }).get('NO2_column_number_density');

    no2Value.evaluate(function(res) {
      if (res === null || res === undefined) {
        showResult('NO2 diagnosis', 'NO DATA', '#666666', 'Point value: No data', 'No interpretation available for this point.');
        return;
      }

      var status, color, rec;
      if (res > 0.0001) {
        status = 'HIGH RISK';
        color = COLORS.danger;
        rec = 'Critical emissions hotspot near a logistics corridor. Priority for cleaner freight, electrified operations, and net-zero intervention.';
      } else if (res > 0.00005) {
        status = 'MEDIUM RISK';
        color = COLORS.warning;
        rec = 'Moderate emissions pressure. Good candidate for phased corridor decarbonization.';
      } else {
        status = 'LOW RISK';
        color = COLORS.success;
        rec = 'Lower carbon pressure relative to surrounding systems.';
      }

      showResult('NO2 diagnosis', status, color, 'Point value: ' + Number(res).toFixed(6), rec);

      lastDiagnosticFeature = ee.Feature(point, {
        variable: 'NO2',
        value: Number(res),
        status: status,
        interpretation: rec,
        lon: coords.lon,
        lat: coords.lat
      });

      var no2Monthly = makeMonthlyCollection(
        no2_col.select('NO2_column_number_density'),
        'NO2_column_number_density',
        '2025-01-01',
        '2026-04-01',
        null,
        null
      );

      var chart = ui.Chart.image.series({
        imageCollection: no2Monthly,
        region: point,
        reducer: ee.Reducer.mean(),
        scale: 1113
      }).setOptions({
        title: 'NO2 trend around selected logistics node',
        vAxis: {title: 'NO2 density'},
        hAxis: {title: 'Month'},
        lineWidth: 2,
        pointSize: 4,
        colors: ['#d73027']
      });

      addChartToPanel(chart, 'Carbon pressure trend');
    });
  }

  else if (layer === 'VIIRS') {
    var viirsValue = viirs_2026.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 500,
      maxPixels: 1e9
    }).get('avg_rad');

    viirsValue.evaluate(function(res) {
      if (res === null || res === undefined) {
        showResult('VIIRS diagnosis', 'NO DATA', '#666666', 'Point value: No data', 'No interpretation available for this point.');
        return;
      }

      var status, color, rec;
      if (res > 10) {
        status = 'HIGH ACTIVITY';
        color = COLORS.danger;
        rec = 'Very active economic-logistics node. Strong candidate as a corridor anchor for scale and impact.';
      } else if (res > 3) {
        status = 'MODERATE ACTIVITY';
        color = COLORS.warning;
        rec = 'Moderately active territory with corridor-link potential.';
      } else {
        status = 'LOW ACTIVITY';
        color = COLORS.success;
        rec = 'Lower detected logistics and urban activity.';
      }

      showResult('VIIRS diagnosis', status, color, 'Point value: ' + Number(res).toFixed(3), rec);

      lastDiagnosticFeature = ee.Feature(point, {
        variable: 'VIIRS',
        value: Number(res),
        status: status,
        interpretation: rec,
        lon: coords.lon,
        lat: coords.lat
      });

      var viirsMonthly = makeMonthlyCollection(
        viirs_col.select('avg_rad'),
        'avg_rad',
        '2025-01-01',
        '2026-04-01',
        null,
        null
      );

      var chart = ui.Chart.image.series({
        imageCollection: viirsMonthly,
        region: point,
        reducer: ee.Reducer.mean(),
        scale: 500
      }).setOptions({
        title: 'Nighttime activity trend around selected node',
        vAxis: {title: 'Radiance'},
        hAxis: {title: 'Month'},
        lineWidth: 2,
        pointSize: 4,
        colors: ['#4575b4']
      });

      addChartToPanel(chart, 'Economic and logistics activity trend');
    });
  }

  else if (layer === 'NDVI') {
    var ndviValue = ndvi_2026.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 1000,
      maxPixels: 1e9
    }).get('NDVI');

    ndviValue.evaluate(function(res) {
      if (res === null || res === undefined) {
        showResult('NDVI diagnosis', 'NO DATA', '#666666', 'Point value: No data', 'No interpretation available for this point.');
        return;
      }

      var status, color, rec;
      if (res > 0.5) {
        status = 'POSITIVE';
        color = COLORS.success;
        rec = 'Strong ecological support around this zone. Favorable for greener corridor framing and environmental buffering.';
      } else if (res > 0.25) {
        status = 'MODERATE';
        color = COLORS.warning;
        rec = 'Intermediate vegetation context. The corridor may require balanced development and ecological safeguards.';
      } else {
        status = 'NEGATIVE';
        color = COLORS.danger;
        rec = 'Low vegetation support. This suggests urban pressure, bare surfaces, or ecosystem degradation.';
      }

      showResult('NDVI diagnosis', status, color, 'Point value: ' + Number(res).toFixed(3), rec);

      lastDiagnosticFeature = ee.Feature(point, {
        variable: 'NDVI',
        value: Number(res),
        status: status,
        interpretation: rec,
        lon: coords.lon,
        lat: coords.lat
      });

      var ndviMonthly = makeMonthlyCollection(
        ndvi_col.select('NDVI'),
        'NDVI',
        '2025-01-01',
        '2026-04-01',
        0.0001,
        null
      );

      var chart = ui.Chart.image.series({
        imageCollection: ndviMonthly,
        region: point,
        reducer: ee.Reducer.mean(),
        scale: 1000
      }).setOptions({
        title: 'Vegetation trend around selected corridor area',
        vAxis: {title: 'NDVI'},
        hAxis: {title: 'Month'},
        lineWidth: 2,
        pointSize: 4,
        colors: ['#1a9850']
      });

      addChartToPanel(chart, 'Ecological support trend');
    });
  }

  else if (layer === 'LST') {
    var lstValue = lst_2026.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 1000,
      maxPixels: 1e9
    }).get('LST');

    lstValue.evaluate(function(res) {
      if (res === null || res === undefined) {
        showResult('LST diagnosis', 'NO DATA', '#666666', 'Point value: No data', 'No interpretation available for this point.');
        return;
      }

      var status, color, rec;
      if (res > 32) {
        status = 'THERMAL ALERT';
        color = COLORS.danger;
        rec = 'Strong surface heat stress. This can indicate sealed surfaces, industrial concentration, or inefficient land use around a corridor.';
      } else if (res > 24) {
        status = 'MODERATE';
        color = COLORS.warning;
        rec = 'Moderate surface temperature conditions.';
      } else {
        status = 'COOL ZONE';
        color = COLORS.accent;
        rec = 'More thermally stable conditions, which may support more climate-resilient corridor planning.';
      }

      showResult('LST diagnosis', status, color, 'Point value: ' + Number(res).toFixed(1) + ' °C', rec);

      lastDiagnosticFeature = ee.Feature(point, {
        variable: 'LST',
        value: Number(res),
        status: status,
        interpretation: rec,
        lon: coords.lon,
        lat: coords.lat
      });

      var lstMonthly = makeMonthlyCollection(
        lst_col.select('LST_Day_1km'),
        'LST',
        '2025-01-01',
        '2026-04-01',
        0.02,
        -273.15
      );

      var chart = ui.Chart.image.series({
        imageCollection: lstMonthly,
        region: point,
        reducer: ee.Reducer.mean(),
        scale: 1000
      }).setOptions({
        title: 'Surface temperature trend around selected area',
        vAxis: {title: 'Temperature (°C)'},
        hAxis: {title: 'Month'},
        lineWidth: 2,
        pointSize: 4,
        colors: ['#f46d43']
      });

      addChartToPanel(chart, 'Thermal stress trend');
    });
  }
});

// ===============================
// 15. MAP DECORATION
// ===============================
var mapTitle = ui.Label('Global Observation Map', {
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: 'rgba(14,36,51,0.82)',
  padding: '8px 12px',
  position: 'top-center'
});

var mapHint = ui.Label(
  'Explore carbon pressure, logistics intensity, vegetation support, and thermal stress for green corridor interpretation.',
  {
    fontSize: '12px',
    color: 'white',
    backgroundColor: 'rgba(23,63,95,0.72)',
    padding: '6px 10px',
    position: 'bottom-center'
  }
);

mapPanel.add(mapTitle);
mapPanel.add(mapHint);

// ===============================
// 16. BUILD SIDEPANEL
// ===============================
sidePanel.add(headerPanel);
sidePanel.add(introPanel);
sidePanel.add(controlsPanel);
sidePanel.add(variableInfoPanel);
sidePanel.add(legendPanel);
sidePanel.add(routePanel);
sidePanel.add(clickInfoPanel);
sidePanel.add(previewPanel);
sidePanel.add(chartPanel);
sidePanel.add(exportPanel);

// ===============================
// 17. LAYOUT
// ===============================
var mainLayout = ui.Panel({
  widgets: [sidePanel, mapPanel],
  layout: ui.Panel.Layout.Flow('horizontal'),
  style: {stretch: 'both'}
});

ui.root.clear();
ui.root.add(mainLayout);

// ===============================
// 18. INITIAL STATE
// ===============================
updateMap('NO2', 0.7);
updateVariableInfo('NO2');
updateLegend('NO2');
updatePreview('NO2');
resetClickPanel();