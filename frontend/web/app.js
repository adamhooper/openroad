(function() {
  var AccidentsMarkerRenderer, AccidentsTableRenderer, AddressSearchForm, CITIES, COLORS, ChartSeriesMaker, Manager, Renderer, SummaryRenderer, TrendChartRenderer, URL, make_expander, selectText,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  URL = 'http://localhost:8000/%{city}';

  COLORS = {
    driving: '#cccc00',
    bicycling: '#00cc00',
    both: '#77cc00'
  };

  CITIES = {
    vancouver: {
      latitude: 49.2505,
      longitude: -123.1119,
      zoom: 12,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(49.131859, -123.264954), new google.maps.LatLng(49.352188, -122.985718))
    },
    calgary: {
      latitude: 51.0451,
      longitude: -114.0569,
      zoom: 12,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(50.842941, -114.613968), new google.maps.LatLng(51.343868, -113.901817))
    },
    toronto: {
      latitude: 43.6517,
      longitude: -79.3827,
      zoom: 13,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(43.584740, -79.639297), new google.maps.LatLng(43.855419, -79.115623))
    },
    ottawa: {
      latitude: 45.4214,
      longitude: -75.6919,
      zoom: 12,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(44.962002, -76.355766), new google.maps.LatLng(45.536541, -75.246033))
    },
    montreal: {
      latitude: 45.5081,
      longitude: -73.5550,
      zoom: 13,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(45.413479, -73.976608), new google.maps.LatLng(45.704788, -73.476418))
    },
    halifax: {
      latitude: 44.6479,
      longitude: -63.5744,
      zoom: 12,
      bounds: new google.maps.LatLngBounds(new google.maps.LatLng(44.434570, -64.237190), new google.maps.LatLng(45.276489, -62.160469))
    }
  };

  selectText = function(element) {
    var range, selection;
    if (document.body.createTextRange != null) {
      range = document.body.createTextRange();
      range.moveToElementText(element);
      return range.select();
    } else if (window.getSelection != null) {
      selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      return selection.addRange(range);
    }
  };

  ChartSeriesMaker = (function() {

    function ChartSeriesMaker() {
      this.data = {};
    }

    ChartSeriesMaker.prototype.add = function(year) {
      var y, _base;
      y = year.toString();
      (_base = this.data)[y] || (_base[y] = 0);
      return this.data[y] += 1;
    };

    ChartSeriesMaker.prototype.getSeries = function() {
      var k, v, _ref, _results;
      _ref = this.data;
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        _results.push([+k, v]);
      }
      return _results;
    };

    return ChartSeriesMaker;

  })();

  Renderer = (function() {

    function Renderer() {}

    Renderer.prototype.clearAccidents = function(mode) {
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        return this.accidents = {};
      } else {
        return delete this.accidents[mode];
      }
    };

    Renderer.prototype.addAccidents = function(mode, accidents) {
      return this.accidents[mode] = accidents;
    };

    return Renderer;

  })();

  SummaryRenderer = (function(_super) {

    __extends(SummaryRenderer, _super);

    function SummaryRenderer(div) {
      this.div = div;
      this.accidents = {};
      this.status = 'no-input';
    }

    SummaryRenderer.prototype.setStatus = function(status) {
      this.status = status;
    };

    SummaryRenderer.prototype.render = function() {
      var bicycling, driving, html, nBicycling, nDriving;
      html = '';
      if (this.status === 'no-input') {
        html = 'Choose an origin and destination...';
      } else {
        bicycling = this.accidents.bicycling != null;
        driving = this.accidents.driving != null;
        if (bicycling) nBicycling = this.accidents.bicycling.length;
        if (driving) nDriving = this.accidents.driving.length;
        if (!bicycling && !driving) {
          html = 'Waiting for server...';
        } else {
          if (!bicycling) {
            html = 'Waiting for server for bicycling data...';
          } else if (!driving) {
            html = 'waiting for server for driving data...';
          } else if (nBicycling === 0 && nDriving !== 0) {
            html = "There have been <span class=\"driving\">" + nDriving + "</span> reported accidents involving cyclists along the <span class=\"driving\">driving</span> route and none for the <span class=\"bicycling\">bicycling</span> route.";
          } else if (nDriving === 0 && nBicycling !== 0) {
            html = "There have been <span class=\"bicycling\">" + nBicycling + "</span> reported accidents involving cyclists along the <span class=\"bicycling\">bicycling</span> route and none for the <span class=\"driving\">driving</span> route.";
          } else if (nDriving === 0 && nBicycling === 0) {
            html = "There have been no reported accidents involving cyclists along either the <span class=\"bicycling\">bicycling</span> or <span class=\"driving\">driving</span> routes.";
          } else {
            html = "There have been <span class=\"driving\">" + nDriving + "</span> reported accidents involving cyclists along the <span class=\"driving\">driving</span> route and <span class=\"bicycling\">" + nBicycling + "</span> along the <span class=\"bicycling\">bicycling</span> route.";
          }
        }
      }
      return $(this.div).html(html);
    };

    return SummaryRenderer;

  })(Renderer);

  AccidentsTableRenderer = (function(_super) {

    __extends(AccidentsTableRenderer, _super);

    function AccidentsTableRenderer(div) {
      this.div = div;
      this.accidents = {};
    }

    AccidentsTableRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, _i, _len;
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        accident.distance_along_path = "" + accident.distance_along_path + "m (" + mode + ")";
      }
      return this.accidents[mode] = accidents;
    };

    AccidentsTableRenderer.prototype.render = function() {
      var $table, $tbody, $tds, $th, $theadTr, $tr, accident, accidents, heading, headings, i, key, keys, mode, modeAccidents, textNode, trClass, value, _i, _len, _len2, _len3, _ref, _ref2;
      accidents = [];
      _ref = this.accidents;
      for (mode in _ref) {
        modeAccidents = _ref[mode];
        accidents = accidents.concat(modeAccidents);
      }
      if (!(accidents.length > 0)) return;
      $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>');
      headings = [];
      _ref2 = accidents[0];
      for (heading in _ref2) {
        value = _ref2[heading];
        if (heading === 'id') continue;
        if (heading === 'distance_along_path') continue;
        if (heading === 'Time') continue;
        if (heading === 'Latitude') continue;
        if (heading === 'Longitude') continue;
        headings.push(heading);
      }
      headings.sort();
      headings.unshift('Time');
      keys = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = headings.length; _i < _len; _i++) {
          heading = headings[_i];
          _results.push(heading.toLowerCase().replace(/\s/g, '-'));
        }
        return _results;
      })();
      keys.unshift('distance_along_path');
      $theadTr = $table.find('thead').children();
      for (i = 0, _len = headings.length; i < _len; i++) {
        heading = headings[i];
        $th = $('<th></th>');
        $th.attr('class', keys[i + 1]);
        $th.text(heading);
        $theadTr.append($th);
      }
      $tbody = $table.find('tbody');
      trClass = 'odd';
      for (_i = 0, _len2 = accidents.length; _i < _len2; _i++) {
        accident = accidents[_i];
        $tr = $('<tr>' + [
          (function() {
            var _j, _len3, _results;
            _results = [];
            for (_j = 0, _len3 = keys.length; _j < _len3; _j++) {
              key = keys[_j];
              _results.push('<td></td>');
            }
            return _results;
          })()
        ].join('') + '</tr>');
        $tr.attr('class', trClass);
        $tr.attr('id', "accident-" + accident.id);
        $tds = $tr.children();
        if (trClass === 'odd') {
          trClass = 'even';
        } else {
          trClass = 'odd';
        }
        for (i = 0, _len3 = keys.length; i < _len3; i++) {
          key = keys[i];
          heading = headings[i - 1];
          $tds[i].className = key;
          textNode = document.createTextNode(accident[heading] || accident[key] || '');
          $tds[i].appendChild(textNode);
        }
        mode = /bicycling/.test(accident.distance_along_path) && 'bicycling' || 'driving';
        $tds[0].className += " " + mode;
        $tbody.append($tr);
      }
      $table.on('dblclick', function(e) {
        return selectText($dataDiv[0]);
      });
      $(this.div).empty();
      return $(this.div).append($table);
    };

    return AccidentsTableRenderer;

  })(Renderer);

  TrendChartRenderer = (function() {

    function TrendChartRenderer(div) {
      this.div = div;
    }

    TrendChartRenderer.prototype.clearAccidents = function(mode) {
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        return this.series = {};
      } else {
        return delete this.series[mode];
      }
    };

    TrendChartRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, seriesMaker, _i, _len;
      if (accidents.length === 0) {
        delete this.series[mode];
        return;
      }
      seriesMaker = new ChartSeriesMaker();
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        seriesMaker.add(accident.Time.split('-')[0]);
      }
      return this.series[mode] = seriesMaker.getSeries();
    };

    TrendChartRenderer.prototype.render = function() {
      var color, innerId, mode, plotSeries, plotSeriesOptions, series, _ref;
      plotSeries = [];
      plotSeriesOptions = [];
      _ref = this.series;
      for (mode in _ref) {
        series = _ref[mode];
        color = COLORS[mode];
        plotSeries.push(series);
        plotSeriesOptions.push({
          color: color
        });
      }
      if (!(plotSeries.length > 0)) return;
      innerId = "" + this.div.id + "-chartInner";
      $(this.div).empty();
      $(this.div).append("<div id=\"" + innerId + "\"></div>");
      return $.jqplot(innerId, plotSeries, {
        highlighter: {
          show: true,
          sizeAdjust: 8
        },
        cursor: {
          show: false
        },
        axes: {
          xaxis: {
            max: 2012,
            tickInterval: 1
          },
          yaxis: {
            min: 0,
            tickInterval: 2
          }
        },
        series: plotSeriesOptions
      });
    };

    return TrendChartRenderer;

  })();

  AccidentsMarkerRenderer = (function() {

    function AccidentsMarkerRenderer(map) {
      var calculateMarkerStyleIndex, clusterUrlRoot, iconStyles, makeIconStyle;
      this.map = map;
      this.markerArrays = {};
      iconStyles = [];
      clusterUrlRoot = "" + window.location.protocol + "//" + window.location.host + (window.location.pathname.replace(/[^\/]*$/, '')) + "/icons";
      calculateMarkerStyleIndex = function(markers, nIconStyles) {
        var accidentsPath, accidentsPathToSmallestIconIndex, iconIndexAddition, index, marker, text, _i, _len;
        accidentsPath = void 0;
        for (_i = 0, _len = markers.length; _i < _len; _i++) {
          marker = markers[_i];
          if (!(accidentsPath != null)) accidentsPath = marker.accidentPath;
          if (accidentsPath !== marker.accidentPath) {
            accidentsPath = 'both';
            break;
          }
        }
        accidentsPathToSmallestIconIndex = {
          driving: 0,
          bicycling: 3,
          both: 6
        };
        iconIndexAddition = 0;
        if (markers.length > 1) iconIndexAddition += 1;
        if (markers.length > 3) iconIndexAddition += 1;
        text = "" + markers.length;
        if (markers.length === 1) text = '1';
        index = accidentsPathToSmallestIconIndex[accidentsPath] + iconIndexAddition;
        return {
          text: text,
          index: index + 1
        };
      };
      makeIconStyle = function(mode, index, size) {
        return {
          width: size,
          height: size,
          textSize: size - 4,
          url: "" + clusterUrlRoot + "/cluster-" + mode + "-" + (index + 1) + ".png"
        };
      };
      iconStyles = [makeIconStyle('driving', 0, 13), makeIconStyle('driving', 1, 15), makeIconStyle('driving', 2, 17), makeIconStyle('bicycling', 0, 13), makeIconStyle('bicycling', 1, 15), makeIconStyle('bicycling', 2, 17), makeIconStyle('both', 0, 13), makeIconStyle('both', 1, 15), makeIconStyle('both', 2, 17)];
      this.clusterer = new MarkerClusterer(this.map, [], {
        averageCenter: true,
        gridSize: 15,
        styles: iconStyles,
        calculator: calculateMarkerStyleIndex,
        minimumClusterSize: 1,
        printable: true,
        zoomOnClick: false
      });
    }

    AccidentsMarkerRenderer.prototype.clearAccidents = function(mode) {
      var accidents, _ref;
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        _ref = this.markerArrays;
        for (mode in _ref) {
          accidents = _ref[mode];
          this.clearAccidents(mode);
        }
        return;
      }
      if (!this.markerArrays[mode]) return;
      this.clusterer.removeMarkers(this.markerArrays[mode]);
      return delete this.markerArrays[mode];
    };

    AccidentsMarkerRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, accidentKeyToMode, key, latLng, latitude, longitude, marker, markers, _, _i, _j, _k, _len, _len2, _len3, _ref, _ref2;
      this.clearAccidents(mode);
      if (accidents.length === 0) return;
      this.markerArrays[mode] = [];
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        latitude = accident.Latitude;
        longitude = accident.Longitude;
        latLng = new google.maps.LatLng(latitude, longitude);
        marker = new google.maps.Marker({
          position: latLng,
          flat: true
        });
        marker.accidentUniqueKey = "" + latitude + "|" + longitude + "|" + accident.Time;
        this.markerArrays[mode].push(marker);
      }
      accidentKeyToMode = {};
      _ref = this.markerArrays;
      for (mode in _ref) {
        markers = _ref[mode];
        for (_j = 0, _len2 = markers.length; _j < _len2; _j++) {
          marker = markers[_j];
          key = marker.accidentUniqueKey;
          if ((accidentKeyToMode[key] != null) && accidentKeyToMode[key] !== mode) {
            accidentKeyToMode[key] = 'both';
          } else {
            accidentKeyToMode[key] = mode;
          }
        }
      }
      _ref2 = this.markerArrays;
      for (_ in _ref2) {
        markers = _ref2[_];
        for (_k = 0, _len3 = markers.length; _k < _len3; _k++) {
          marker = markers[_k];
          key = marker.accidentUniqueKey;
          marker.accidentPath = accidentKeyToMode[key];
        }
      }
      this.clusterer.addMarkers(this.markerArrays[mode], true);
      return this.clusterer.repaint();
    };

    AccidentsMarkerRenderer.prototype.render = function() {};

    return AccidentsMarkerRenderer;

  })();

  Manager = (function() {

    function Manager(map, origin, destination, city, summaryDiv, chartDiv, dataDiv) {
      this.map = map;
      this.origin = origin;
      this.destination = destination;
      this.city = city;
      this.setCity(this.city);
      this.summaryRenderer = new SummaryRenderer(summaryDiv);
      this.summaryRenderer.setStatus('no-input');
      this.summaryRenderer.render();
      this.tableRenderer = new AccidentsTableRenderer(dataDiv);
      this.chartRenderer = new TrendChartRenderer(chartDiv);
      this.markerRenderer = new AccidentsMarkerRenderer(this.map);
    }

    Manager.prototype.setCity = function(city) {
      var latlng, zoom, zoomData;
      this.city = city;
      zoomData = CITIES[this.city];
      latlng = new google.maps.LatLng(zoomData.latitude, zoomData.longitude);
      zoom = zoomData.zoom;
      this.map.setCenter(latlng);
      return this.map.setZoom(zoom);
    };

    Manager.prototype.getCityBounds = function() {
      return CITIES[this.city].bounds;
    };

    Manager.prototype.setOrigin = function(origin) {
      this.origin = origin;
      if (this.origin) {
        if (!(this.originMarker != null)) {
          this.originMarker = new google.maps.Marker({
            position: this.origin,
            map: this.map
          });
        } else {
          this.originMarker.setPosition(this.origin);
        }
      } else {
        if (this.originMarker != null) {
          this.originMarker.setMap(null);
          delete this.originMarker;
        }
      }
      return this.updateDirections();
    };

    Manager.prototype.setDestination = function(destination) {
      this.destination = destination;
      if (this.destination) {
        if (!(this.destinationMarker != null)) {
          this.destinationMarker = new google.maps.Marker({
            position: this.destination,
            map: this.map
          });
        } else {
          this.destinationMarker.setPosition(this.destination);
        }
      } else {
        if (this.destinationMarker != null) {
          this.destinationMarker.setMap(null);
          delete this.destinationMarker;
        }
      }
      return this.updateDirections();
    };

    Manager.prototype.updateDirections = function() {
      if ((this.origin != null) && (this.destination != null)) {
        return this.queryAndUpdateDirections();
      }
    };

    Manager.prototype.getLocationForRequest = function(location) {
      return location;
    };

    Manager.prototype.getOriginForRequest = function() {
      return this.getLocationForRequest(this.origin);
    };

    Manager.prototype.getDestinationForRequest = function() {
      return this.getLocationForRequest(this.destination);
    };

    Manager.prototype.getDirectionsRequest = function(mode) {
      var googleMode;
      googleMode = {
        driving: google.maps.TravelMode.DRIVING,
        bicycling: google.maps.TravelMode.BICYCLING
      }[mode];
      return {
        origin: this.getOriginForRequest(),
        destination: this.getDestinationForRequest(),
        travelMode: googleMode,
        provideRouteAlternatives: false,
        unitSystem: google.maps.UnitSystem.METRIC,
        region: 'ca'
      };
    };

    Manager.prototype.getDirectionsService = function() {
      return this.directionsService || (this.directionsService = new google.maps.DirectionsService());
    };

    Manager.prototype.getDirectionsRenderer = function(mode) {
      var color, _this;
      this.directionsRenderers || (this.directionsRenderers = {});
      if (!(this.directionsRenderers[mode] != null)) {
        color = COLORS[mode];
        this.directionsRenderers[mode] = new google.maps.DirectionsRenderer({
          draggable: true,
          map: this.map,
          polylineOptions: {
            strokeColor: color
          },
          preserveViewport: true,
          suppressInfoWindows: true,
          suppressMarkers: true
        });
        this.directionsRenderers[mode].bikefile_mode = mode;
        _this = this;
        google.maps.event.addListener(this.directionsRenderers[mode], 'directions_changed', function(e) {
          return _this.queryAndUpdatePolylineRelatedLayer(mode, this.directions);
        });
      }
      return this.directionsRenderers[mode];
    };

    Manager.prototype.queryAndUpdateDirectionsForMode = function(mode) {
      var renderer, request, service;
      request = this.getDirectionsRequest(mode);
      renderer = this.getDirectionsRenderer(mode);
      service = this.getDirectionsService();
      return service.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          return renderer.setDirections(result);
        }
      });
    };

    Manager.prototype.queryAndUpdateDirections = function() {
      this.clearOldData();
      this.summaryRenderer.setStatus('querying');
      this.queryAndUpdateDirectionsForMode('bicycling');
      return this.queryAndUpdateDirectionsForMode('driving');
    };

    Manager.prototype.queryAndUpdatePolylineRelatedLayer = function(mode, googleDirectionsResult) {
      var encoded_polyline, postData, url,
        _this = this;
      this.lastRequests || (this.lastRequests = {});
      if (this.lastRequests[mode] != null) {
        this.lastRequests[mode].abort();
        delete this.lastRequests[mode];
      }
      this.clearOldData(mode);
      encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points;
      postData = {
        encoded_polyline: encoded_polyline
      };
      url = URL.replace(/%\{city\}/, this.city);
      return this.lastRequests[mode] = $.ajax({
        url: url,
        type: 'POST',
        data: postData,
        dataType: 'json',
        success: function(data) {
          delete _this.lastRequests[mode];
          _this.clearOldData(mode);
          return _this.handleNewData(mode, data);
        }
      });
    };

    Manager.prototype.clearOldData = function(mode) {
      if (mode == null) mode = void 0;
      this.summaryRenderer.clearAccidents(mode);
      this.tableRenderer.clearAccidents(mode);
      this.chartRenderer.clearAccidents(mode);
      return this.markerRenderer.clearAccidents(mode);
    };

    Manager.prototype.handleNewData = function(mode, data) {
      this.summaryRenderer.addAccidents(mode, data);
      this.tableRenderer.addAccidents(mode, data);
      this.chartRenderer.addAccidents(mode, data);
      this.markerRenderer.addAccidents(mode, data);
      this.summaryRenderer.render();
      this.tableRenderer.render();
      this.chartRenderer.render();
      return this.markerRenderer.render();
    };

    return Manager;

  })();

  window.Manager = Manager;

  make_expander = function(div) {
    var $h2;
    $h2 = $(div).children('h2');
    return $h2.on('click', function(e) {
      var $inner;
      $inner = $(div).children('div');
      if ($inner.is(':visible')) {
        return $inner.hide();
      } else {
        return $inner.show();
      }
    });
  };

  $.fn.expander = function() {
    return $.each(this, function() {
      return make_expander(this);
    });
  };

  AddressSearchForm = (function() {

    function AddressSearchForm(form, originOrDestination, manager) {
      var $form,
        _this = this;
      this.originOrDestination = originOrDestination;
      this.manager = manager;
      $form = $(form);
      this.$a = $form.find('a');
      this.aText = this.$a.text();
      this.$input = $form.find('input[type=text]');
      this.$status = $form.find('div.status');
      this.$error = $form.find('div.error');
      this.lastAddressTyped = this.$input.val();
      this.mapListener = void 0;
      $form.on('submit', function(e) {
        e.stopPropagation();
        e.preventDefault();
        return _this.onAddressTyped();
      });
      this.$a.on('click', function(e) {
        var $a;
        $a = $(e.target);
        e.stopPropagation();
        e.preventDefault();
        if (_this.mapListener != null) {
          google.maps.event.removeListener(_this.mapListener);
          _this.mapListener = void 0;
          return _this.setClickingOnMap(false);
        } else {
          _this.mapListener = google.maps.event.addListenerOnce(_this.manager.map, 'click', function(e) {
            _this.mapListener = void 0;
            _this.setClickingOnMap(false);
            return _this.onAddressClicked(e.latLng);
          });
          return _this.setClickingOnMap(true);
        }
      });
    }

    AddressSearchForm.prototype.setClickingOnMap = function(clickingOnMap) {
      if (clickingOnMap) {
        this.$a.text('Click a point on the map to choose it');
        return this.$a.addClass('clicking');
      } else {
        this.$a.text(this.aText);
        return this.$a.removeClass('clicking');
      }
    };

    AddressSearchForm.prototype.getGeocoder = function() {
      return this.geocoder || (this.geocoder = new google.maps.Geocoder());
    };

    AddressSearchForm.prototype.onAddressTyped = function() {
      var addressTyped,
        _this = this;
      addressTyped = this.$input.val();
      if (addressTyped === this.lastAddressTyped) return;
      this.setError(void 0);
      if ($.trim(addressTyped || '')) {
        this.setStatus('Looking up address');
        this.lastAddressTyped = addressTyped;
        return this.getGeocoder().geocode({
          'address': addressTyped,
          'bounds': this.manager.getCityBounds()
        }, function(results, status) {
          return _this.onAddressGeocoded(results, status);
        });
      } else {
        this.setStatus(void 0);
        return this.setLatLng(void 0);
      }
    };

    AddressSearchForm.prototype.setStatus = function(status) {
      this.$status.text(status || '');
      if (status != null) {
        return this.$status.show();
      } else {
        return this.$status.hide();
      }
    };

    AddressSearchForm.prototype.setError = function(error) {
      this.$error.text(error || '');
      if (error != null) {
        return this.$error.show();
      } else {
        return this.$error.hide();
      }
    };

    AddressSearchForm.prototype.onAddressClicked = function(latlng) {
      var _this = this;
      this.setLatLng(latlng);
      this.setError(void 0);
      if (latlng != null) {
        this.setStatus('Finding address');
        return this.getGeocoder().geocode({
          latLng: latlng
        }, function(results, status) {
          _this.$input.val('…');
          return _this.onLatLngGeocoded(results, status);
        });
      } else {
        this.$input.val('');
        return this.setStatus(void 0);
      }
    };

    AddressSearchForm.prototype.setLatLng = function(latlng) {
      var bounds;
      if (this.originOrDestination === 'origin') {
        this.manager.setOrigin(latlng);
      } else {
        this.manager.setDestination(latlng);
      }
      if (latlng != null) {
        bounds = this.manager.map.getBounds();
        if (!bounds.contains(latlng)) {
          bounds.extend(latlng);
          return this.manager.map.fitBounds(bounds);
        }
      }
    };

    AddressSearchForm.prototype.onAddressGeocoded = function(results, status) {
      var cityBounds;
      this.setStatus(void 0);
      cityBounds = this.manager.getCityBounds();
      if (status === google.maps.GeocoderStatus.ZERO_RESULTS || (status === google.maps.GeocoderStatus.OK && !cityBounds.contains(results[0].geometry.location))) {
        this.setError('Address not found');
        return this.setLatLng(null);
      } else if (status === google.maps.GeocoderStatus.OK) {
        return this.setLatLng(results[0].geometry.location);
      } else {
        this.setError('Failed to look up address');
        return this.setLatLng(null);
      }
    };

    AddressSearchForm.prototype.onLatLngGeocoded = function(results, status) {
      this.setStatus(void 0);
      if (status === google.maps.GeocoderStatus.OK) {
        return this.$input.val(results[0].formatted_address);
      } else {
        return this.$input.val('(point on map)');
      }
    };

    return AddressSearchForm;

  })();

  $.fn.address_search_form = function(originOrDestination, manager) {
    return $.each(this, function() {
      return new AddressSearchForm(this, originOrDestination, manager);
    });
  };

}).call(this);
