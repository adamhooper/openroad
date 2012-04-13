URL = 'http://localhost:8000/%{city}'

CITIES = {
  'vancouver': new google.maps.LatLngBounds(
    new google.maps.LatLng(49.131859, -123.264954),
    new google.maps.LatLng(49.352188, -122.985718)
  ),
  'calgary': new google.maps.LatLngBounds(
    new google.maps.LatLng(50.842941, -114.613968),
    new google.maps.LatLng(51.343868, -113.901817)
  ),
  'toronto': new google.maps.LatLngBounds(
    new google.maps.LatLng(43.584740, -79.639297),
    new google.maps.LatLng(43.855419, -79.115623)
  ),
  'ottawa': new google.maps.LatLngBounds(
    new google.maps.LatLng(44.962002, -76.355766),
    new google.maps.LatLng(45.536541, -75.246033)
  ),
  'montreal': new google.maps.LatLngBounds(
    new google.maps.LatLng(45.413479, -73.976608),
    new google.maps.LatLng(45.704788, -73.476418)
  ),
  'halifax': new google.maps.LatLngBounds(
    new google.maps.LatLng(44.434570, -64.237190),
    new google.maps.LatLng(45.276489, -62.160469)
  ),
}

selectText = (element) ->
  if document.body.createTextRange?
    range = document.body.createTextRange()
    range.moveToElementText(element)
    range.select()
  else if window.getSelection?
    selection = window.getSelection()
    range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)

class ChartSeriesMaker
  constructor: () ->
    @data = {}

  add: (year) ->
    y = year.toString()
    @data[y] ||= 0
    @data[y] += 1

  getSeries: () ->
    ([ +k, v ] for k, v of @data)

class AccidentsTableRenderer
  constructor: (@div) ->
    @accidents = {}

  clearAccidents: (mode = undefined) ->
    if !mode?
      @accidents = {}
    else
      delete @accidents[mode]

  addAccidents: (mode, accidents) ->
    for accident in accidents
      accident.distance_along_path = "#{accident.distance_along_path}m (#{mode})"

    @accidents[mode] = accidents

  render: () ->
    accidents = []
    for mode, modeAccidents of @accidents
      accidents = accidents.concat(modeAccidents)

    return unless accidents.length > 0

    $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>')

    headings = []

    for heading, value of accidents[0]
      continue if heading == 'id'
      continue if heading == 'distance_along_path'
      continue if heading == 'Time'

      # We can't give Google-provided geocoded data
      # TODO: make exception for Toronto?
      continue if heading == 'Latitude'
      continue if heading == 'Longitude'
      headings.push(heading)

    headings.sort()
    headings.unshift('Time')

    keys = ( heading.toLowerCase().replace(/\s/g, '-') for heading in headings )
    keys.unshift('distance_along_path')

    $theadTr = $table.find('thead').children()
    for heading, i in headings
      $th = $('<th></th>')
      $th.attr('class', keys[i+1])
      $th.text(heading)
      $theadTr.append($th)

    $tbody = $table.find('tbody')
    trClass = 'odd'

    for accident in accidents
      $tr = $('<tr>' + ['<td></td>' for key in keys].join('') + '</tr>')
      $tr.attr('class', trClass)
      $tr.attr('id', "accident-#{accident.id}")
      $tds = $tr.children()

      if trClass == 'odd' then trClass = 'even' else trClass = 'odd'

      for key, i in keys
        heading = headings[i-1]
        $tds[i].className = key
        textNode = document.createTextNode(accident[heading] || accident[key] || '')
        $tds[i].appendChild(textNode)

      $tbody.append($tr)

    $table.on 'dblclick', (e) ->
      selectText($dataDiv[0])

    $(@div).empty()
    $(@div).append($table)

class TrendChartRenderer
  constructor: (@div) ->

  clearAccidents: (mode = undefined) ->
    if !mode?
      @series = {}
    else
      delete @series[mode]

  addAccidents: (mode, accidents) ->
    if accidents.length == 0
      delete @series[mode]
      return

    seriesMaker = new ChartSeriesMaker()

    for accident in accidents
      seriesMaker.add(accident.Time.split('-')[0])

    @series[mode] = seriesMaker.getSeries()

  render: () ->
    plotSeries = []
    plotSeriesOptions = []

    for mode, series of @series
      color = {
        bicycling: 'blue',
        driving: 'yellow',
      }[mode]

      plotSeries.push(series)
      plotSeriesOptions.push({color:color})

    return unless plotSeries.length > 0

    innerId = "#{@div.id}-chartInner"

    $(@div).empty()
    $(@div).append("<div id=\"#{innerId}\"></div>")

    $.jqplot(innerId, plotSeries, {
      highlighter: { show: true, sizeAdjust: 8 },
      cursor: { show: false },
      axes: {
        xaxis: { max: 2012, tickInterval: 1 },
        yaxis: { min: 0, tickInterval: 2 },
      },
      series: plotSeriesOptions
    })

class AccidentsMarkerRenderer
  constructor: (@map) ->
    @markerArrays = {}

  clearAccidents: (mode = undefined) ->
    if !mode?
      this.clearAccidents(mode) for mode, accidents of @markerArrays
      return

    return if !@markerArrays[mode]

    for marker in @markerArrays[mode]
      marker.setMap(null)

    delete @markerArrays[mode]

  addAccidents: (mode, accidents) ->
    this.clearAccidents(mode)

    return if accidents.length == 0

    @markerArrays[mode] = []
    for accident in accidents
      latitude = accident.Latitude
      longitude = accident.Longitude
      latLng = new google.maps.LatLng(latitude, longitude)
      marker = new google.maps.Marker(position: latLng)
      @markerArrays[mode].push(marker)
      marker.setMap(@map)

  render: () ->
    # nothing. See addAccidents()

class Manager
  constructor: (@map, @origin, @destination, @city, dataDiv, chartDiv) ->
    this.setCity(@city)
    @tableRenderer = new AccidentsTableRenderer(dataDiv)
    @chartRenderer = new TrendChartRenderer(chartDiv)
    @markerRenderer = new AccidentsMarkerRenderer(@map)

  setCity: (@city) ->
    bounds = CITIES[@city]
    @map.fitBounds(bounds)

  setOrigin: (@origin) ->

  setDestination: (@destination) ->

  getLocationForRequest: (location) ->
    location

  getOriginForRequest: () ->
    this.getLocationForRequest(@origin)

  getDestinationForRequest: () ->
    this.getLocationForRequest(@destination)

  getDirectionsRequest: (mode) ->
    googleMode = {
      driving: google.maps.TravelMode.DRIVING,
      bicycling: google.maps.TravelMode.BICYCLING
    }[mode]

    {
      origin: this.getOriginForRequest(),
      destination: this.getDestinationForRequest(),
      travelMode: googleMode,
      provideRouteAlternatives: false,
      unitSystem: google.maps.UnitSystem.METRIC,
      region: 'ca'
    }

  getDirectionsService: () ->
    @directionsService ||= new google.maps.DirectionsService()

  getDirectionsRenderer: (mode) ->
    @directionsRenderers ||= {}

    if !@directionsRenderers[mode]?
      color = {
        driving: 'yellow',
        bicycling: 'blue',
      }[mode]

      @directionsRenderers[mode] = new google.maps.DirectionsRenderer({
        draggable: true,
        map: @map,
        polylineOptions: {
          strokeColor: color
        },
        preserveViewport: true,
        suppressInfoWindows: true,
      })
      @directionsRenderers[mode].bikefile_mode = mode
      _this = this
      google.maps.event.addListener @directionsRenderers[mode], 'directions_changed', (e) ->
        _this.queryAndUpdatePolylineRelatedLayer(mode, this.directions)

    return @directionsRenderers[mode]

  queryAndUpdateDirectionsForMode: (mode) ->
    # All these are cached...
    request = this.getDirectionsRequest(mode)
    renderer = this.getDirectionsRenderer(mode)
    service = this.getDirectionsService()

    service.route request, (result, status) ->
      if status == google.maps.DirectionsStatus.OK
        renderer.setDirections(result)


  queryAndUpdateDirections: () ->
    this.clearOldData()

    this.queryAndUpdateDirectionsForMode('bicycling')
    this.queryAndUpdateDirectionsForMode('driving')

  queryAndUpdatePolylineRelatedLayer: (mode, googleDirectionsResult) ->
    @lastRequests ||= {}

    if @lastRequests[mode]?
      @lastRequests[mode].cancel()
      delete @lastRequests[mode]

    this.clearOldData(mode) # just in case?

    encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points
    postData = { encoded_polyline: encoded_polyline }

    url = URL.replace(/%\{city\}/, @city)

    @lastRequests[mode] = $.ajax({ url: url, type: 'POST', data: postData, dataType: 'json', success: (data) =>
      delete @lastRequests[mode]

      this.clearOldData(mode) # just in case?
      this.handleNewData(mode, data)
    })

  clearOldData: (mode = undefined) ->
    @tableRenderer.clearAccidents(mode)
    @chartRenderer.clearAccidents(mode)
    @markerRenderer.clearAccidents(mode)

  handleNewData: (mode, data) ->
    @tableRenderer.addAccidents(mode, data)
    @chartRenderer.addAccidents(mode, data)
    @markerRenderer.addAccidents(mode, data)

    @tableRenderer.render()
    @chartRenderer.render()
    @markerRenderer.render()

window.Manager = Manager
