    let map, scriptPanel = scrollama(), trafficLayer, airpollutionlayer;
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
      storyboard.style.top = storyboardMarginTop + "px"
      scriptPanel.resize();
    }

    mapboxgl.accessToken = 'pk.eyJ1IjoiYXRyYW4wMjMiLCJhIjoiY21reGhuaGJ2MGE5MzNsbmJkZjV0cWVvOCJ9.AXQlCqhl_yS9Uw4N6amrNg';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [-122.3321, 47.6062],
        zoom: 4,
        pitch: 30,
        bearing: -10,
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: false
    });

    async function geojsonFetch() {

      let response, traffic; //add pollution dataset later
      response = await fetch("assets/traffic-flow-counts-2022.geojson");
      traffic = await response.json();
    //   response = await fetch("");
    //   airpollution = await response.json();

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
        map.addLayer({
            id: 'seattle-boundary',
            type: 'line',
            source: 'seattle-bounds',
            paint: {
                'line-color': '#2D5F3F',
                'line-width': 2,
                'line-dasharray': [3, 2],
                'line-opacity': 0.5
            }
        });

        map.addSource('traffic-src', {
          type: 'geojson',
          data: traffic
        });

        trafficLayer = {
            'id': 'traffic-flow-lines',
            'type': 'line',
            'source': 'traffic-src',
            'paint': {
                'line-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'AWDT'], 
                    0, '#2D5F3F',
                    5000, '#FCBF49',
                    15000, '#F77F00',
                    30000, '#E63946'
                ],
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['get', 'AWDT'],
                    0, 2,
                    5000, 3,
                    15000, 4,
                    30000, 6
                    ],
                'line-opacity': 0.85
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
                center: [-122.3321, 47.6062],
                zoom: 11,
                pitch: 30,
                bearing: -10,
                speed: 0.8,
                curve: 1
            });
            
            if (typeof (map.getSource('traffic-src')) == 'undefined') { 
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
            document.getElementById("cover").style.visibility = "hidden"; 

          } else if (index === 1) { 
            //relocate
          } else if (index === 2) {
            //relocate

          } else if (index === 3) {
            //relocate

            map.setStyle('mapbox://styles/mapbox/satellite-streets-v10');
          } else if (index === 6) {

            map.flyTo({
              center: [-122.4121036, 47.6131229],
              zoom: 12,
              pitch: 0,
              speed: 0.5

            });


          }
        }

        // controls which story board is shwown
        function handleSceneExit(response) {
          var index = response.index;

          if (index === 0) {
            if (map.getLayer("counties-polygons")) {
              map.removeLayer('counties-polygons');
            }
            if (response.direction == 'down') { 
              document.getElementById("cover").style.visibility = "hidden"; 
            } else {
              document.getElementById("cover").style.visibility = "visible"; 
            }
          } else if (index === 1) {
            if (map.getLayer("celltowers-points")) {
              map.removeLayer('celltowers-points');
            }
          } else if (index === 3) {
            //
            map.setStyle('mapbox://styles/mapbox/light-v10');
          } 
        }


      });

    };

    geojsonFetch();
