URL = 'http://localhost:8000/%{city}'

CITIES = {
  'toronto': new google.maps.LatLng(43.6541, -79.3828),
  'montreal': new google.maps.LatLng(45.5081, -73.5550),
  'halifax': new google.maps.LatLng(44.6500, -63.6000),
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

class Manager
  constructor: (@map, @origin, @destination, @city, @dataDiv, @chartDiv) ->
    this.setCity(@city)

  setCity: (@city) ->
    latLng = CITIES[@city]
    @map.setCenter(latLng)
    @map.setZoom(12)

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

  getDirectionsRenderer: () ->
    return @directionsRenderer if @directionsRenderer?

    @directionsRenderer = new google.maps.DirectionsRenderer()
    @directionsRenderer.setMap(@map)
    @directionsRenderer

  queryAndUpdateDirections: (callback) ->
    request = this.getDirectionsRequest('bicycling')
    service = this.getDirectionsService()
    renderer = this.getDirectionsRenderer()
    service.route request, (result, status) ->
      if status == google.maps.DirectionsStatus.OK
        renderer.setDirections(result)
        callback(result)

  queryAndUpdatePolylineRelatedLayer: (googleDirectionsResult) ->
    encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points

    if @markers?
      for marker in @markers
        marker.setMap(null)
    @markers = []

    $dataDiv = $(@dataDiv || [])
    $chartDiv = $(@chartDiv || [])

    $dataDiv.empty()
    $chartDiv.empty()

    postData = { encoded_polyline: encoded_polyline }

    url = URL.replace(/%\{city\}/, @city)

    $.ajax({ url: url, type: 'POST', data: postData, dataType: 'json', success: (data) =>
      minYear = undefined
      maxYear = undefined

      $dataDiv.empty()
      $chartDiv.empty()

      for accident in data
        minYear = accident.year if !minYear? || minYear > accident.year
        maxYear = accident.year if !maxYear? || maxYear < accident.year

      seriesMaker = new ChartSeriesMaker()

      return if !data || !data.length

      $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>')

      headings = []

      for heading, value of data[0]
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

      for accident, rowNumber in data
        $tr = $('<tr>' + ['<td></td>' for key in keys].join('') + '</tr>')
        $tr.attr('class', trClass)
        $tr.attr('id', "accident-#{accident.id}")
        $tds = $tr.children()

        if trClass == 'odd' then trClass = 'even' else trClass = 'odd'

        accident.distance_along_path = "#{accident.distance_along_path}m"

        for key, i in keys
          heading = headings[i-1]
          $tds[i].className = key
          textNode = document.createTextNode(accident[heading] || accident[key] || '')
          $tds[i].appendChild(textNode)

        $tbody.append($tr)

        latitude = accident.Latitude
        longitude = accident.Longitude
        latLng = new google.maps.LatLng(latitude, longitude)
        marker = new google.maps.Marker(position: latLng)
        @markers.push(marker)
        marker.setMap(@map)

        seriesMaker.add(accident.Time.split('-')[0])

      $dataDiv.append($table)

      $table.on 'dblclick', (e) ->
        selectText($dataDiv[0])

      plotSeries = seriesMaker.getSeries()
      $chartInner = $('<div></div>')
      $chartInner.attr('id', @chartDiv.id + '-chartInner')
      $chartDiv.append($chartInner)

      $.jqplot($chartInner[0].id, [plotSeries], {
        highlighter: { show: true, sizeAdjust: 8 },
        cursor: { show: false },
        xaxis: {},
        yaxis: { min: 0 },
      })
    })

window.Manager = Manager
