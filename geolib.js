/** 
	geolib - geography library of constants and functions
	for geography and navigation trigonometry
*/

// static constants
voyc.ε = 1e-6			// epsilon
voyc.ε2 = voyc.ε * voyc.ε	// epsilon squared
voyc.π = Math.PI		// pi
voyc.τ = 2 * Math.PI		// tau = 2 * pi
voyc.τε = voyc.τ - voyc.ε	// tau minus epsilon
voyc.halfπ = Math.PI / 2	// half pi
voyc.radiusKm = 6371		// radius of planet earth in km
voyc.circumferenceKm = 40075.01669	// circumference of planet earth in km, 2 * PI * radiusKm
voyc.ppcm = 37.79527559		// pixels per cm = 96 ppi

voyc.radians = function(x) { return x * (Math.PI / 180) }
voyc.degrees = function(x) { return x * (180 / Math.PI) }
voyc.secant = function(x) { return 1/Math.cos(voyc.radians(x))} // reciprocal cosine, a ratio 
voyc.powR = function(x,y) { return Math.log(y) / Math.log(x) } // reciprocal power, x**n == y, return n

voyc.mercatorStretch = function(latm) {var phim=voyc.radians(latm); var phi =Math.log(Math.tan(Math.PI / 4 + phim / 2)); return voyc.degrees(phi)}
voyc.mercatorShrink  = function(lat)  {var phi =voyc.radians(lat);  var phim=(2*Math.atan(Math.exp(phi))) - (Math.PI/2); return voyc.degrees(phim)}

voyc.scaler = function(width,zoom,ppcm) {
	var ppcm = ppcm || voyc.ppcm
	var earthcm = voyc.circumferenceKm * 100000	
	var mapcm = width / ppcm
	var scale = (1/(2**zoom)) * (earthcm / mapcm)
	return Math.round(scale)
}
voyc.scalezero = 591657527.591555  // scale at zoom 0 (one tile at 256 pixels, and ppi of 96)

voyc.scaleGraph = function(uscale) {
	var multiplier = [5,4,2,1]
	var magnitude = [9,8,7,6,5,4,3,2,1]
	var n,cm
	var loop = true
	for (var mag of magnitude) {
		for (var mul of multiplier) {
			n = (10**mag) * mul
			cm = uscale/n
			if (cm > 1)
				loop = false
			if (!loop)
				break
		}
		if (!loop)
			break
	}

	var nd, unit
	if (n >= 100000) {
		nd = n / 100000
		unit = 'km'
	}
	else if (n >= 100) {
		nd = n / 100
		unit = 'm'
	}
	else {
		nd = Math.round(n)
		unit = 'cm'
	}
	var pxl = Math.round(cm * voyc.ppcm)
	return {n:nd,unit:unit,cm:cm,pxl:pxl}
}



voyc.distanced3 = function(a, b) { // original d3 function
	var Δλ = voyc.radians((b[0] - a[0])), φ0 = voyc.radians(a[1]), φ1 = voyc.radians(b[1]), sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t
	return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ)
}

// great circle = plane intersecting the centerpoint of a sphere
// small circle = plane intersecting a sphere, but not the centerpoint
// rhumb line = arc of sperical helix, https://www.youtube.com/watch?v=3BF_ZKfJiso, 3:35

voyc.distanceKm = function(coA, coB) {
	return this.calcθ(coA, coB) * voyc.radiusKm
}
voyc.distancePixels = function(coA, coB, scale) {
	return this.calcθ(coA, coB) * scale
}
voyc.calcθ = function(coA, coB) {
	// calc distance between two coordinates using the haversine formula
	// create a great circle through the two points and the center of the sphere
	// source: https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates

	var λA = voyc.radians(coA[0])  // (lowercase lambda) = longitude
	var φA = voyc.radians(coA[1])  // (lowercase phi) = latitude
	var λB = voyc.radians(coB[0])
	var φB = voyc.radians(coB[1])

	var Δλ = λB-λA  // delta lambda = change in longitude
	var Δφ = φB-φA

	var hav = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
		  Math.sin(Δλ/2) * Math.sin(Δλ/2) * Math.cos(φA) * Math.cos(φB) 

	var θ = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1-hav))  // (lowercase theta) = central angle
	return θ
}

voyc.geointerpolate = function(source, target, t) {
	var x0 = voyc.radians(source[0])
	var y0 = voyc.radians(source[1])
	var x1 = voyc.radians(target[0])
	var y1 = voyc.radians(target[1])

	var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(voyc.haversin(y1 - y0) + cy0 * cy1 * voyc.haversin(x1 - x0))), k = 1 / Math.sin(d)
	var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1
	return [ voyc.degrees(Math.atan2(y, x)), voyc.degrees(Math.atan2(z, Math.sqrt(x * x + y * y)))]
}

voyc.haversin = function(x) {
	return (x = Math.sin(x / 2)) * x
}

// calculate the angle of two points against the x-axis
voyc.calcAngle = function(ptStart, ptEnd) {
	var X = 0
	var Y = 1
	var d = []
	d[Y] = ptEnd[Y] - ptStart[Y]
	d[X] = ptEnd[X] - ptStart[X]
	var theta = Math.atan2(d[Y], d[X]) // range (-PI, PI]
	theta *= 180 / Math.PI // rads to degs, range (-180, 180]
	if (theta < 0) theta = 360 + theta // range [0, 360)
	return theta
}

voyc.drawMeridian = function(lng,goalltheway) {
	var goalltheway = goalltheway || false
	var threshold = (goalltheway) ? 90 : 80
	var coords = []
	for (var lat=0-threshold; lat<=threshold; lat+=10) {
		coords.push([lng,lat])
	}
	return coords
}
voyc.drawParallel = function(lat) {
	var coords = []
	for (var lng=-180; lng<=180; lng+=10) {
		coords.push([lng,lat])
	}
	return coords
}

