$(document).ready(function() {
    
    var map;
    var markers = [];
    var polygon = null;

    // Create new map
    function initMap() {
        var styles = [
            {
                "featureType": "all",
                "stylers": [
                    {
                        "saturation": 0
                    },
                    {
                        "hue": "#e7ecf0"
                    }
                ]
            },
            {
                "featureType": "road",
                "stylers": [
                    {
                        "saturation": -70
                    }
                ]
            },
            {
                "featureType": "transit",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "water",
                "stylers": [
                    {
                        "color": "#3ec7c9"
                    },
                    {
                        "visibility": "on"
                    }
                ]
            }
        ]

        map = new google.maps.Map($('#map')[0], {
            zoom: 12,
            center: {lat: 51.4, lng: 5.4},
            styles: styles,
            mapTypeControl: false
        });

        // set the locations that will be shown on the map
        var locations = [
            // {title: 'Sri Lanka', location: {lat: 7.873054, lng: 80.771797}},
            {title: 'ValTech Eindhoven', location: {lat: 51.443442, lng: 5.46138}, heading: 135, pitch: 25},
            {title: 'Cederlaan', location: {lat:  51.445304, lng: 5.450547}, heading: 25, pitch: 25},
            {title: 'SSC Eindhoven', location: {lat:  51.451917, lng: 5.489120}, heading: -15, pitch: 8},
            {title: 'station Eindhoven', location: {lat:  51.442141, lng: 5.479949}, heading: 0, pitch: 15}
            // {title: 'Sagrada de Familia', location: {lat:  41.403999, lng: 2.1738}, heading: 135, pitch: 35},
            // {title: 'La Sagrada Familia', location: {lat:  41.404051, lng: 2.174995}, heading: 225, pitch: 35}
            // {title: 'Australia', location: {lat:  -25.274398, lng: 133.775136}}
            // {title: 'Canada', location: {lat:  56.130366, lng: -106.346771}}
        ];

        var largeInfowindow = new google.maps.InfoWindow({
            maxWidth: 200
        });
        var bounds = new google.maps.LatLngBounds();

        /*
         * Initialize the drawing manager
         */
        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON, 
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT, 
                drawingModes: [
                    google.maps.drawing.OverlayType.POLYGON
                ]
            }
        });

        var defaultIcon = {
            url: 'http://findicons.com/files/icons/2498/party_elements/256/2.png',
            scaledSize: new google.maps.Size(25, 25), // scaled size
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 15)
        }
        var highlightedIcon = {
            url: 'http://findicons.com/files/icons/2498/party_elements/256/2.png',
            scaledSize: new google.maps.Size(35, 35), // scaled size
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 20)
        }


        for (var i = 0; i < locations.length; i++) {
            var position = locations[i].location;
            var title = locations[i].title;
            var heading = locations[i].heading;
            var pitch = locations[i].pitch;

            var marker = new google.maps.Marker({
                map: map,
                position: position,
                title: title,
                heading: heading,
                pitch: pitch,
                icon: defaultIcon,
                animation: google.maps.Animation.DROP,
                id: i
            });
            // push marker to array of markers
            markers.push(marker);
            // icon change
            marker.addListener('mouseover', function() {
                this.setIcon(highlightedIcon);
            });
            marker.addListener('mouseout', function() {
                this.setIcon(defaultIcon);
            });
            // extend boundaries of map for each marker
            bounds.extend(marker.position);
            // create event to open infowindow
            marker.addListener('click', function() {
                populateInfoWindow(this, largeInfowindow);
            });
        };
        map.fitBounds(bounds);

        $('#show-listings').on('click', showListings);
        $('#hide-listings').on('click', hideListings);
        $('#toggle-drawing').on('click', function() {
            toggleDrawing(drawingManager);
        });
        $('#zoom-to-area').on('click', function() {
            zoomToArea();
        });

        /* 
         * When the polygon is drawed, 
         * the searchWithinPolyong function has to be called.
         * This will show the markers inside, 
         * and hide any markers outside of the polygon.
         */
        drawingManager.addListener('overlaycomplete', function(event) {
            // Check if a polygon exists
            // if there is, get rid of it and remove the markers
            if (polygon) {
                polygon.setMap(null);
                hideListings();
            }
            // Switch the drawing mode to hand, so no more drawing
            drawingManager.setDrawingMode(null);
            // Creating a new editable polygon from overlay 
            polygon = event.overlay;
            polygon.setEditable(true);
            // Search within polygon
            searchWithinPolygon();
            // Calculate area polygon
            calculatePolygonArea(polygon);
            // Make sure to search again when the polygon is changed
            polygon.getPath().addListener('set_at', function() {
                searchWithinPolygon();
                calculatePolygonArea();
            });
            polygon.getPath().addListener('insert_at', function() {
                searchWithinPolygon();
                calculatePolygonArea();
            });
        });

        /* 
         * set infowindow, when to load and what it contains
         * also streetview is added
         */
        function populateInfoWindow(marker, infowindow) {
            if (infowindow.marker != marker) {
                // clear infowindow to give streetview time to load
                infowindow.setContent('');
                infowindow.marker = marker;
                // clear marker property
                infowindow.addListener('closeclick', function() {
                    infowindow.marker = null;
                });
                // set streetview
                var streetViewService = new google.maps.StreetViewService();
                var radius = 50;

                /*
                 * set streetview function
                 */ 
                function getStreetView(data, status) {
                    if(status == google.maps.StreetViewStatus.OK) {
                        var nearStreetViewLocation = data.location.latLng; 
                        var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                        infowindow.setContent('<div>' + marker.title + '</div><br><div id="pano"></div>');
                        var panoramaOptions = {
                            position: nearStreetViewLocation,
                            pov: {
                                heading: marker.heading,
                                pitch: marker.pitch
                            }
                        };
                        console.log(marker.pitch);
                        var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
                    } else {
                        infowindow.setContent('<div>' + marker.title + '</div>' + '<br><div>No Streetview found</div>');
                    }
                }
                // Use streetview service to get the closest streetview image within
                streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
                // Open window on correct marker
                infowindow.open(map, marker);
            }
        }

        /*
         * loop through markers and display them
         */
        function showListings() {
            var bounds = new google.maps.LatLngBounds();
            //extend boundaries map
            for (var i = 0; i < markers.length; i++) {
                markers[i].setMap(map);
                bounds.extend(markers[i].position);
            }
            map.fitBounds(bounds);
        }

        /*
         * loop through markers and hide them
         */
        function hideListings() {
            for (var i = 0; i < markers.length; i++) {
                markers[i].setMap(null);
            }
        }

        /*
         * this shows and hides (respectively) the drawing options
         */
        function toggleDrawing(drawingManager) {
            if(drawingManager.map) {
                drawingManager.setMap(null);
                // In case the user switches off drawing and drew anything, get rid of the polygon
                if (polygon) {
                    polygon.setMap(null);
                }
            } else {
                drawingManager.setMap(map);
            }
        }

        /*
         * hide all markers outside polygon,
         * only show the ones within it.
         * This way the user can specify exact area of search!
         */
        function searchWithinPolygon() {
            for (var i = 0; i < markers.length; i++) {
                if (google.maps.geometry.poly.containsLocation(markers[i].position, polygon)) {
                    markers[i].setMap(map);
                } else {
                    markers[i].setMap(null);
                }
            }
        }

        /*
         * calculate the polygon area
         * log this in the console, it's in square meters
         */
        function calculatePolygonArea() {
            var polygonArea = google.maps.geometry.spherical.computeArea(polygon.getPath());
            console.log('polygonArea:', polygonArea);
        }

        /* 
         * takes input value to find nearby area of the text input
         * located and zoomed in. User can show all and then decide to focus on one area of the map.
         */
        function zoomToArea() {
            //Initialize geocoder
            var geocoder = new google.maps.Geocoder();
            // Get the addres of the user
            var address = document.getElementById('zoom-to-area-text').value;
            // Is the address filled in??
            if (address == '') {
                window.alert('You must enter an area or address.'); 
            } else {
                // Geocode the entered value and then center and zoom in
                geocoder.geocode({
                    address: address,
                    componentRestrictions: {country: 'Nederland'}
                }, function(result, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        map.setCenter(result[0].geometry.location);
                        map.setZoom(20);
                        // Put the formatted address and the location on the page
                        $('#firstComponent').html("The formatted address is " + result[0].formatted_address);
                        $('#secondComponent').html("The location is " + result[0].geometry.location);

                        var marker = new google.maps.Marker({
                            position: result[0].geometry.location,
                            // heading: heading,
                            icon: highlightedIcon,
                            animation: google.maps.Animation.DROP
                        });
                        marker.setMap(map);
                    } else {
                        window.alert('We could not find the location. Try entering a more specific place.')
                    }
                });
            }
        }

    };
    initMap();


});

