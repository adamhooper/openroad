(function() {
  var AccidentsTableRenderer, CITIES, ChartSeriesMaker, Manager, URL, selectText;

  URL = 'http://localhost:8000/%{city}';

  CITIES = {
    'vancouver': new google.maps.LatLngBounds(new google.maps.LatLng(49.131859, -123.264954), new google.maps.LatLng(49.352188, -122.985718)),
    'calgary': new google.maps.LatLngBounds(new google.maps.LatLng(50.842941, -114.613968), new google.maps.LatLng(51.343868, -113.901817)),
    'toronto': new google.maps.LatLngBounds(new google.maps.LatLng(43.584740, -79.639297), new google.maps.LatLng(43.855419, -79.115623)),
    'ottawa': new google.maps.LatLngBounds(new google.maps.LatLng(44.962002, -76.355766), new google.maps.LatLng(45.536541, -75.246033)),
    'montreal': new google.maps.LatLngBounds(new google.maps.LatLng(45.413479, -73.976608), new google.maps.LatLng(45.704788, -73.476418)),
    'halifax': new google.maps.LatLngBounds(new google.maps.LatLng(44.434570, -64.237190), new google.maps.LatLng(45.276489, -62.160469))
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

  AccidentsTableRenderer = (function() {

    function AccidentsTableRenderer(div) {
      this.div = div;
    }

    AccidentsTableRenderer.prototype.render = function(accidents) {
      var $table, $tbody, $tds, $th, $theadTr, $tr, accident, heading, headings, i, key, keys, textNode, trClass, value, _i, _len, _len2, _len3, _ref;
      if (!(accidents.length > 0)) return;
      $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>');
      headings = [];
      _ref = accidents[0];
      for (heading in _ref) {
        value = _ref[heading];
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
        accident.distance_along_path = "" + accident.distance_along_path + "m";
        for (i = 0, _len3 = keys.length; i < _len3; i++) {
          key = keys[i];
          heading = headings[i - 1];
          $tds[i].className = key;
          textNode = document.createTextNode(accident[heading] || accident[key] || '');
          $tds[i].appendChild(textNode);
        }
        $tbody.append($tr);
      }
      $table.on('dblclick', function(e) {
        return selectText($dataDiv[0]);
      });
      return $(this.div).append($table);
    };

    return AccidentsTableRenderer;

  })();

  Manager = (function() {

    function Manager(map, origin, destination, city, dataDiv, chartDiv) {
      this.map = map;
      this.origin = origin;
      this.destination = destination;
      this.city = city;
      this.dataDiv = dataDiv;
      this.chartDiv = chartDiv;
      this.setCity(this.city);
    }

    Manager.prototype.setCity = function(city) {
      var bounds;
      this.city = city;
      bounds = CITIES[this.city];
      return this.map.fitBounds(bounds);
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

    Manager.prototype.getDirectionsRenderer = function() {
      if (this.directionsRenderer != null) return this.directionsRenderer;
      this.directionsRenderer = new google.maps.DirectionsRenderer();
      this.directionsRenderer.setMap(this.map);
      return this.directionsRenderer;
    };

    Manager.prototype.queryAndUpdateDirections = function(callback) {
      var renderer, request, service;
      request = this.getDirectionsRequest('bicycling');
      service = this.getDirectionsService();
      renderer = this.getDirectionsRenderer();
      return service.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          renderer.setDirections(result);
          return callback(result);
        }
      });
    };

    Manager.prototype.queryAndUpdatePolylineRelatedLayer = function(googleDirectionsResult) {
      var $chartDiv, $dataDiv, encoded_polyline, marker, postData, url, _i, _len, _ref,
        _this = this;
      encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points;
      if (this.markers != null) {
        _ref = this.markers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          marker = _ref[_i];
          marker.setMap(null);
        }
      }
      this.markers = [];
      $dataDiv = $(this.dataDiv || []);
      $chartDiv = $(this.chartDiv || []);
      $dataDiv.empty();
      $chartDiv.empty();
      postData = {
        encoded_polyline: encoded_polyline
      };
      url = URL.replace(/%\{city\}/, this.city);
      return $.ajax({
        url: url,
        type: 'POST',
        data: postData,
        dataType: 'json',
        success: function(data) {
          var $chartInner, accident, latLng, latitude, longitude, maxYear, minYear, plotSeries, rowNumber, seriesMaker, tableRenderer, _j, _len2, _len3;
          minYear = void 0;
          maxYear = void 0;
          $dataDiv.empty();
          $chartDiv.empty();
          tableRenderer = new AccidentsTableRenderer($dataDiv[0]);
          tableRenderer.render(data);
          for (_j = 0, _len2 = data.length; _j < _len2; _j++) {
            accident = data[_j];
            if (!(minYear != null) || minYear > accident.year) {
              minYear = accident.year;
            }
            if (!(maxYear != null) || maxYear < accident.year) {
              maxYear = accident.year;
            }
          }
          seriesMaker = new ChartSeriesMaker();
          if (!data || !data.length) return;
          for (rowNumber = 0, _len3 = data.length; rowNumber < _len3; rowNumber++) {
            accident = data[rowNumber];
            latitude = accident.Latitude;
            longitude = accident.Longitude;
            latLng = new google.maps.LatLng(latitude, longitude);
            marker = new google.maps.Marker({
              position: latLng
            });
            _this.markers.push(marker);
            marker.setMap(_this.map);
            seriesMaker.add(accident.Time.split('-')[0]);
          }
          plotSeries = seriesMaker.getSeries();
          $chartInner = $('<div></div>');
          $chartInner.attr('id', _this.chartDiv.id + '-chartInner');
          $chartDiv.append($chartInner);
          return $.jqplot($chartInner[0].id, [plotSeries], {
            highlighter: {
              show: true,
              sizeAdjust: 8
            },
            cursor: {
              show: false
            },
            xaxis: {},
            yaxis: {
              min: 0
            }
          });
        }
      });
    };

    return Manager;

  })();

  window.Manager = Manager;

}).call(this);
