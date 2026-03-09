let map, scriptPanel = scrollama(), seattleLayer, trafficLayer, aqiLayer;

history.scrollRestoration = "manual";
window.scrollTo(0, 0);
adjustStoryboardlSize();
window.addEventListener("resize", adjustStoryboardlSize);

function adjustStoryboardlSize() {
  const scenes = document.getElementsByClassName("scene");
  const storyboard = document.getElementById("storyboard");
  let sceneH = Math.floor(window.innerHeight * 0.75);
  for (const scene of scenes) {
    scene.style.height = sceneH + "px";
  }
  let storyboardHeight = window.innerHeight;
  let storyboardMarginTop = (window.innerHeight - storyboardHeight) / 2;
  storyboard.style.height = storyboardHeight + "px";
  storyboard.style.top = storyboardMarginTop + "px";
  scriptPanel.resize();
}

mapboxgl.accessToken = 'pk.eyJ1IjoiYXRyYW4wMjMiLCJhIjoiY21reGhuaGJ2MGE5MzNsbmJkZjV0cWVvOCJ9.AXQlCqhl_yS9Uw4N6amrNg';

map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [-122.3321, 47.6062],
  zoom: 7,
  minZoom: 3,
  maxZoom: 10,
  pitch: 30,
  bearing: -10,
  scrollZoom: false,
  boxZoom: false,
  doubleClickZoom: false
});

async function geojsonFetch() {
  let response, traffic;
  response = await fetch("assets/traffic-flow-counts-2022.geojson");
  traffic = await response.json();
  response = await fetch("assets/WA_AQI_2022.json")
  aqi = await response.json();

  map.on('load', () => {

    map.addSource('seattle-bounds', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-122.459696, 47.481002],
            [-122.224433, 47.481002],
            [-122.224433, 47.734136],
            [-122.459696, 47.734136],
            [-122.459696, 47.481002]
          ]]
        }
      }
    });

    map.addSource('traffic-src', {
      type: 'geojson',
      data: traffic
    });

    map.addSource('aqi-src', {
      type: 'geojson',
      data: aqi
    });

    seattleLayer = {
      'id': 'seattle-polygons',
      'type': 'fill',
      'source': 'seattle-bounds',
      'minzoom': 5,
      'paint': {
        'fill-color': '#0080ff',
        'fill-opacity': 0.5
      }
    };

    trafficLayer = {
      'id': 'traffic-flow-lines',
      'type': 'line',
      'source': 'traffic-src',
      'paint': {
        'line-color': [
          'interpolate', ['linear'], ['get', 'AWDT'],
          0, '#2D5F3F',
          5000, '#FCBF49',
          15000, '#F77F00',
          30000, '#E63946'
        ],
        'line-width': [
          'interpolate', ['linear'], ['get', 'AWDT'],
          0, 2,
          5000, 3,
          15000, 4,
          30000, 6
        ],
        'line-opacity': 0.85
      }
    };

    aqiLayer = {
      'id': 'aqi-circles',
      'type': 'circle',
      'source': 'aqi-src',
      'paint': {
      'circle-color': [
        'interpolate', ['linear'],
        ['/', 
          ['*', ['get', 'days_unhealthy_or_worse'], 100], 
          ['get', 'total_days']
        ],
        0, '#2D5F3F',    // 0% - Good
        1, '#FCBF49',    // 1% - starting to show issues
        3, '#F77F00',    // 3% - moderate concern
        6, '#E63946',    // 6% - unhealthy
        10, '#7B2D8B',   // 10% - very unhealthy
        15, '#7E0023'    // 15%+ - hazardous
      ],

      'circle-radius': [
        'interpolate', ['linear'],
        ['/', 
          ['*', ['get', 'days_unhealthy_or_worse'], 100], 
          ['get', 'total_days']
        ],
        0, 5,
        3, 8,
        6, 12,
        10, 16,
        15, 22
      ],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    };

    map.on('click', 'traffic-flow-lines', function(e) {
      const properties = e.features[0].properties;
      let year = 'Unknown';
      if (properties.START_DATE) {
        const dateMatch = properties.START_DATE.match(/\d{4}/);
        if (dateMatch) year = dateMatch[0];
      }
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <h3>Traffic Information</h3>
          <p><strong>Street:</strong> ${properties.STNAME_ORD || 'N/A'}</p>
          <p><strong>Daily Volume (AWDT):</strong> ${properties.AWDT ? properties.AWDT.toLocaleString() : 'N/A'} vehicles</p>
          <p><strong>Year:</strong> ${year}</p>
          <p><strong>Segment ID:</strong> ${properties.FLOWSEGID || 'N/A'}</p>
        `)
        .addTo(map);
    });
    map.on('mouseenter', 'traffic-flow-lines', function() {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'traffic-flow-lines', function() {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'aqi-circles', function(e) {
      const p = e.features[0].properties;
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <h3>${p.station}</h3>
          <p><strong>Good days:</strong> ${p.good_days}</p>
          <p><strong>Moderate days:</strong> ${p.moderate_days}</p>
          <p><strong>Unhealthy or worse:</strong> ${p.days_unhealthy_or_worse}</p>
          <p><strong>Total days recorded:</strong> ${p.total_days}</p>
        `)
        .addTo(map);
    });
    map.on('mouseenter', 'aqi-circles', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'aqi-circles', () => map.getCanvas().style.cursor = '');

    scriptPanel
      .setup({
        step: ".scene",
        offset: 0.33,
        debug: false
      })
      .onStepEnter(handleSceneEnter)
      .onStepExit(handleSceneExit);

    function handleSceneEnter(response) {
      var index = response.index;

      if (index === 0) {
        map.flyTo({
          center: [-122.4121036, 47.6131229],
          zoom: 12,
          pitch: 0,
          speed: 0.5
        });

        if (typeof map.getSource('seattle-bounds') == 'undefined') {
          map.addSource('seattle-bounds', seattleLayer.source);
        }

        if (!map.getLayer("seattle-polygons")) {
          map.addLayer(seattleLayer);
        }

        document.getElementById("cover").style.visibility = "hidden";

      } else if (index === 1) {
        document.getElementById("traffic-legend").style.display = "block";
        map.flyTo({
          center: [-122.4121036, 47.6131229],
          zoom: 12,
          pitch: 0,
          speed: 0.5
        });

        if (typeof map.getSource('traffic-src') == 'undefined') {
          map.addSource('traffic-src', {
            type: 'geojson',
            data: traffic
          });
        } else {
          map.getSource('traffic-src').setData(traffic);
        }

        if (!map.getLayer("traffic-flow-lines")) {
          map.addLayer(trafficLayer);
        }

      } else if (index === 2) {
        document.getElementById("aqi-legend").style.display = "block";
        map.flyTo({
          center: [-120.5, 47.5], 
          zoom: 7,
          pitch: 0,
          speed: 0.5
        });

        if (typeof map.getSource('aqi-src') == 'undefined') {
          map.addSource('aqi-src', { type: 'geojson', data: aqi });
        } else {
          map.getSource('aqi-src').setData(aqi);
        }

        if (!map.getLayer('aqi-circles')) {
          map.addLayer(aqiLayer);
        }
      } else if (index === 3) {
        map.flyTo({
          center: [-122.4121036, 47.6131229],
          zoom: 12,
          pitch: 0,
          speed: 0.5
        });

        if (!map.getLayer('traffic-flow-lines')) {
          map.addLayer(trafficLayer);
        }
        if (!map.getLayer('aqi-circles')) {
          map.addLayer(aqiLayer);
        }
        map.setFilter('aqi-circles', null);

      } else if (index === 4) {
        map.setStyle('mapbox://styles/mapbox/navigation-day-v1');
        
        map.once('style.load', () => {
          map.flyTo({
            center: [-122.42, 47.756],
            zoom: 12,
            pitch: 45,
            bearing: -10,
            speed: 0.5
          });

          map.addSource('traffic-src', { type: 'geojson', data: traffic });
          map.addLayer(trafficLayer);
          document.getElementById("traffic-legend").style.display = "block";
        });
        document.getElementById("traffic-legend").style.display = "block";
      } else if (index === 5) {
        map.flyTo({
          center: [-122.43, 47.52],
          zoom: 14,
          pitch: 45,
          bearing: -10,
          speed: 0.5
        });

        if (typeof map.getSource('aqi-src') == 'undefined') {
          map.addSource('aqi-src', { type: 'geojson', data: aqi });
        }

        if (!map.getLayer('aqi-circles')) {
          map.addLayer(aqiLayer);
        }

        document.getElementById("aqi-legend").style.display = "block";
      }
    }

    function handleSceneExit(response) {
      var index = response.index;

      if (index === 0) {
        if (map.getLayer("seattle-polygons")) {
          map.removeLayer('seattle-polygons');
        }
        if (response.direction === 'down') {
          document.getElementById("cover").style.visibility = "hidden";
        } else {
          document.getElementById("cover").style.visibility = "visible";
        }

      } else if (index === 1) {
        document.getElementById("traffic-legend").style.display = "none";
        if (map.getLayer("traffic-flow-lines")) {
          map.removeLayer('traffic-flow-lines');
        }
      } else if (index === 2) {
        document.getElementById("aqi-legend").style.display = "none";
        if (map.getLayer('aqi-circles')) {
          map.removeLayer('aqi-circles');
        }

      } else if (index === 3) {
        if (map.getLayer('traffic-flow-lines')) {
          map.removeLayer('traffic-flow-lines');
        }
        if (map.getLayer('aqi-circles')) {
          map.removeLayer('aqi-circles');
        }
        document.getElementById("traffic-legend").style.display = "none";
        document.getElementById("aqi-legend").style.display = "none";
      } else if (index === 4) {
        if (map.getLayer('traffic-flow-lines')) {
          map.removeLayer('traffic-flow-lines');
        }
        document.getElementById("traffic-legend").style.display = "none";
      } else if (index === 5) {
        document.getElementById("aqi-legend").style.display = "none";
        map.setStyle('mapbox://styles/mapbox/dark-v10');

        map.once('style.load', () => {
          map.addSource('traffic-src', { type: 'geojson', data: traffic });
          map.addSource('aqi-src', { type: 'geojson', data: aqi });
          map.addSource('seattle-bounds', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [-122.459696, 47.481002],
                  [-122.224433, 47.481002],
                  [-122.224433, 47.734136],
                  [-122.459696, 47.734136],
                  [-122.459696, 47.481002]
                ]]
              }
            }
          });
        });
      }

    }

  });
}

geojsonFetch();
