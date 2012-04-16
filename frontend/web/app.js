(function() {
  var AccidentsMarkerRenderer, AccidentsTableRenderer, CITIES, COLORS, ChartSeriesMaker, Manager, Renderer, SummaryRenderer, TrendChartRenderer, URL, make_expander, selectText,
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
      zoom: 12
    },
    calgary: {
      latitude: 51.0451,
      longitude: -114.0569,
      zoom: 12
    },
    toronto: {
      latitude: 43.6481,
      longitude: -79.4042,
      zoom: 13
    },
    ottawa: {
      latitude: 45.4214,
      longitude: -75.6919,
      zoom: 12
    },
    montreal: {
      latitude: 45.5081,
      longitude: -73.5550,
      zoom: 12
    },
    halifax: {
      latitude: 44.6479,
      longitude: -63.5744,
      zoom: 12
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
      this.map = map;
      this.markerArrays = {};
    }

    AccidentsMarkerRenderer.prototype.clearAccidents = function(mode) {
      var accidents, marker, _i, _len, _ref, _ref2;
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
      _ref2 = this.markerArrays[mode];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.setMap(null);
      }
      return delete this.markerArrays[mode];
    };

    AccidentsMarkerRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, latLng, latitude, longitude, marker, _i, _len, _results;
      this.clearAccidents(mode);
      if (accidents.length === 0) return;
      this.markerArrays[mode] = [];
      _results = [];
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        latitude = accident.Latitude;
        longitude = accident.Longitude;
        latLng = new google.maps.LatLng(latitude, longitude);
        marker = new google.maps.Marker({
          position: latLng,
          flat: true
        });
        this.markerArrays[mode].push(marker);
        _results.push(marker.setMap(this.map));
      }
      return _results;
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

    Manager.prototype.setOrigin = function(origin) {
      this.origin = origin;
    };

    Manager.prototype.setDestination = function(destination) {
      this.destination = destination;
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
          suppressInfoWindows: true
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

}).call(this);
