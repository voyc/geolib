/** 
	class GeoIterator
	Inspired by d3.js version 3.5.17, 17 June 2016.
	
	This class contains methods to interate through the coordinates of GeoJSON objects.

	Notes on polygon rings.
		One polygon includes one or more rings.
		The first ring is the exterior ring and must wind clockwise.
		Additional rings are holes and must wind counter-clockwise.
		A "donut" has two rings, one exterior and one hole.
		"winding" direction is CW or CCW, clockwise or counter-clockwise.
		In a "closed" ring the first point and the last point are identical.
		In d3:
			exterior ring must be clockwise
			interior ring, hole, must be counter-clockwise
			polygons larger than a hemisphere are not supported
		In canvas: 
			A polygon and its holes must be in opposite directions.
			ctx.fillRule or winding rule: "nonzero" or "evenodd"
		In svg:
			?
		In postgis:
			st_reverse(geom) - reverse the direction of a polygon
			st_enforceRHR(geom) - enforce the "right-hand rule"
				right-hand rule means the exterior ring must be CW and holes must be CCW
		In voyc:
			only 1 ring per polygon
			This means that one set of [] goes to waste.
			In iteratePolygon(), we take only the first ring: polygon[0]

	Restrictive assumptions about our data.
		1. No rings.  All of our polygons have 1 ring only.  No holes.
			In our original data, we found two exceptions:
			A. In the countries data, the country of South Africa has one hole, 
				for the country of Lesotho.  We ignore the hole and make certain we
				draw Leosotho on top of South Africa.
			B. In the land data, the 112th polygon has a 52-point hole beginning at
				[48.87488, 36.31921] which is the Caspian Sea.  We ignore the hole and 
				add the Caspian Sea to the lakes data which is drawn on top of the land.

		2. All polygons are closed.  Last point duplicates the first.
			
		3. No straight lines.  So we can skip adaptive resampling.
			Exceptions:
			A. The graticule.  We compose our own graticule using a large number
				of points so that resampling is not necessary.
			B. The line between Canada and USA.
			C. The eastern border of Madagascar.
			To all exceptions, we will solve the issue by adding points to the data,
			instead of additional processing at runtime.
				
		4. Uniform collections.  All the geometries in a GeometryCollection are of
			the same type:  all points or multipoints, all polygons or multipolygons, 
			all lines or multilines.  No one collection combines points,
			lines, and polygons.  This saves us having to change the stack of 
			iteratees for each geometry within one collection iteration.

	Class Hierarchy
		GeoIterator - base class, does nothing
			GeoIteratorCount - for developer
			GeoIteratorHitTest 
			GeoIteratorClip - drawing, clipCircle for Orthogonal, clipExtant for cylindrical, and cylindrical stitch
				GeoIteratorCustom
				GeoIteratorSketch
				GeoIteratorHilite
				GeoIteratorScale - select palette and draw by sorted group
					GeoIteratorAnimate
					GeoIteratorEmpire
*/

var geolog = false

/* 
	GeoIterator is an abstract class.  
	It iterates through the data but does nothing.
	Instantiate one of the subclasses below.
*/
voyc.GeoIterator = function() {
	this.ret = false
	this.forcePoint = false
}

/* 	
	method: iterateCollection()
	entry point. always call this method to iterate a dataset.
	parameter 1 - a collection
	parameter additional - override collectionStart to read additional parameters
*/
voyc.GeoIterator.prototype.iterateCollection = function(collection, ...add) {
	this.ret = false
	this.collection = collection
	if (this.collectionStart(collection, add)) { 
		var boo = true // continue nested iterations until boo goes false
		var geometries = collection['geometries']
		var len = geometries.length
		var i = -1
		while (boo && ++i<len) {
			boo = this.iterateGeometry(geometries[i])
		}
		this.collectionEnd(collection);
	}
	return this.ret // set depending on subclass
}

voyc.GeoIterator.prototype.iterateGeometry = function(geometry) {
	this.geometry = geometry
	this.polygon = false
	this.line = false
	var boo = null
	var geostat = this.geometryStart(geometry)
	if (geostat === 0)  // skip this geom, but continue loop
		boo = true
	else if (geostat === false) // kill the loop
		boo = false
	else if (geostat === true) {   // process this geom
		boo = true
		if (!geometry)
			debugger;
		var coordinates = geometry['coordinates']
		var len = coordinates.length
		var i = -1
		switch(geometry['type']) {
			case 'MultiPolygon':
				while (boo && ++i<len) {
					boo = this.iteratePolygon(coordinates[i])
				}
				break
			case 'Polygon':
				boo = this.iteratePolygon(coordinates)
				break
			case 'MultiLineString':
				while (boo && ++i<len) {
					boo = this.iterateLine(coordinates[i])
				}
				break
			case 'LineString':
				boo = this.iterateLine(coordinates)
				break
			case 'MultiPoint':
				while (boo && ++i<len) {
					boo = this.doPoint(coordinates[i], 'point', i)
				}
				break
			case 'Point':
				boo = this.doPoint(coordinates, 'point', i)
				break
		}
		this.geometryEnd(geometry)
	}
	return boo
}

voyc.GeoIterator.prototype.iteratePolygon = function(polygon) {
	this.polygon = polygon
	var poly = polygon[0] // voyc uses only one ring per polygon
	var boo = true
	if (this.polygonStart(poly)) {
		boo = true
		var len = poly.length
		var i = -1
		while (boo && ++i<len) {
			boo = this.doPoint(poly[i], 'poly', i)
		}
	}
	this.polygonEnd(poly)
	return boo 
}

voyc.GeoIterator.prototype.iterateLine = function(line) {
	this.line = line
	if (this.lineStart(line)) {
		var boo = true
		var len = line.length
		var i = -1
		while (boo && ++i<len) {
			boo = this.doPoint(line[i], 'line', i)
		}
	}
	this.lineEnd(line)
	return boo
}

voyc.GeoIterator.prototype.doPoint = function(point, within, ndx) {
	return true
}

/* 
	overrideable methods
*/
voyc.GeoIterator.prototype.collectionStart = function(collection, ...add) {}
voyc.GeoIterator.prototype.collectionEnd=function(collection) {}
voyc.GeoIterator.prototype.geometryStart = function(geometry) {return true}
voyc.GeoIterator.prototype.geometryEnd = function(geometry) {}
voyc.GeoIterator.prototype.polygonStart = function(polygon) {return true}
voyc.GeoIterator.prototype.polygonEnd = function(polygon) {}
voyc.GeoIterator.prototype.lineStart = function(line) {return true}
voyc.GeoIterator.prototype.lineEnd = function(line) {}

// -------- Count

voyc.GeoIteratorCount = function() {
	voyc.GeoIterator.call(this)
}
voyc.GeoIteratorCount.prototype = Object.create(voyc.GeoIterator.prototype)

voyc.GeoIteratorCount.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(['iterate count',collection.name])
	this.saveCollection = collection
	this.param1 = add[0] // custom
	this.param2 = add[1]
	this.param3 = add[2]
	this.points = 0
	this.lines = 0
	this.polygons = 0
	this.geometries = 0
}
voyc.GeoIteratorCount.prototype.collectionEnd = function(collection) {
	log&console.log([collection.name,
		'geom',this.geometries,
		'poly',this.polygons,
		'line',this.lines,
		'pt',this.points])
},
voyc.GeoIteratorCount.prototype.doPoint = function(point, within, ndx) { this.points++; return true }
voyc.GeoIteratorCount.prototype.lineStart = function(line) { this.lines++; return true }
voyc.GeoIteratorCount.prototype.polygonStart = function(polygon) { this.polygons++; return true }
voyc.GeoIteratorCount.prototype.geometryStart = function(geometry) { this.geometries++; return true}

// -------- Clip   draw with small-circle clipping

voyc.GeoIteratorClip = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorClip.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorClip.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(voyc.prepString('iterate draw $1',[collection.name]))
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.pass = 0
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	return true
}

voyc.GeoIteratorClip.prototype.collectionEnd = function(collection) {
	this.draw(0)
}

voyc.GeoIteratorClip.prototype.draw = function(paletteNdx) {
	var palette = this.palette[paletteNdx]
	this.ctx.fillStyle = palette.pat || palette.fill
	this.ctx.strokeStyle = palette.stroke
	this.ctx.lineWidth = palette.pen
	if (palette.dash) this.ctx.setLineDash(palette.dash)
	if (palette.fill) this.ctx.fill()
	if (palette.stroke) this.ctx.stroke()
}

voyc.GeoIteratorClip.prototype.geometryStart = function(geometry) {
	this.pass += 1
	return true
}

voyc.GeoIteratorClip.prototype.geometryEnd = function(geometry) {
	// cylindrical stitch
	if (this.pass == 1 && this.projection.mixer.stitch) {
		var wd = this.projection.mx[1][0] - this.projection.mx[0][0]
		this.projection.pt[0] += wd
		this.iterateGeometry(geometry) // again to the right
		this.projection.pt[0] -= (2*wd)
		this.iterateGeometry(geometry) // again to the left
		this.projection.pt[0] += wd
	}
	this.pass -= 1
}

voyc.GeoIteratorClip.prototype.lineStart = function(line) {
	this.polygonStart(line)
	return true
}

voyc.GeoIteratorClip.prototype.polygonStart = function(polygon) {
	this.pointCount = 0;
	this.visiblePointCount = 0;
	this.firstVisiblePointInRing = false;
	this.lastVisiblePointInRing = false;
	this.lastVisiblePointBeforeGap = false;
	this.firstVisiblePointAfterGap = false;
	this.isGapAtStart = false;
	this.isGapAtEnd = false;
	this.previousPt = false;
	return true
}
voyc.GeoIteratorClip.prototype.polygonEnd = function(polygon) {
	if (!this.previousPt) {
		this.isGapAtEnd = true;
	}
	if (this.visiblePointCount && (this.isGapAtStart || this.isGapAtEnd)) {
		this.arcGap(this.lastVisiblePointInRing, 
			this.firstVisiblePointInRing, 
			this.projection.pt, 
			this.projection.k, 
			this.ctx);
		this.ctx.lineTo(this.firstVisiblePointInRing[0],this.firstVisiblePointInRing[1]);
	}
}

voyc.GeoIteratorClip.prototype.doPoint = function(co, within, ndx) {
	var pt = this.projection.project(co);
	if (pt[2]) {                                           // if visible
		if (!this.firstVisiblePointInRing) {           //    if first visible point
			this.firstVisiblePointInRing = pt;     //       save it
		}
		else if (this.lastVisiblePointBeforeGap) {     //    else if gap finished
			this.firstVisiblePointAfterGap = pt;   //       save 1st visible after gap
			if (within == 'poly')
				this.arcGap(this.lastVisiblePointBeforeGap, 
					this.firstVisiblePointAfterGap, 
					this.projection.pt,    //       if poly 
					this.projection.k)     //          draw arc in the gap 
			else if (within == 'line')             //       if line
				this.visiblePointCount = 0     //          kill the lineTo 
			this.lastVisiblePointBeforeGap = false;//          mark done with gap
		}
		if (within == 'point' || this.forcePoint)
			this.drawPoint(pt, within, ndx)
		else {
			if (this.visiblePointCount)            //    if some visible point already
				this.ctx.lineTo(pt[0],pt[1])   //       lineTo
			else                                   //    else
				this.ctx.moveTo(pt[0],pt[1])   //       moveTo
		}
		this.visiblePointCount++                       //    count it
		this.lastVisiblePointInRing = pt               //    mark it last visible (so far)
		this.previousPt = pt                           // save previous
	}
	else {                                                 // else if not visible
		if (!this.pointCount) {                        //    if first point
			this.isGapAtStart = true               //       mark gap at start
		}
		if (!this.lastVisiblePointBeforeGap &&         //    if no last-before-gap
				this.previousPt) {             //       and not the first point
			this.lastVisiblePointBeforeGap = this.previousPt;
		}                                              //       prev point was last-before-gap
	}
	this.pointCount++                                      // count
	return true
}

voyc.GeoIteratorClip.prototype.drawPoint = function(pt, within, ndx) {
	//var palette = this.palette[0]
	//var radius = this.palette[0].ptRadius
	//this.ctx.arc(pt[0],pt[1], radius, 0, 2*Math.PI, false)
	//this.ctx.beginPath()

	var palette = this.palette[this.paletteNdx]
	this.ctx.moveTo(pt[0]+palette.ptRadius-1,pt[1]+palette.ptRadius-1)
	this.ctx.arc(pt[0],pt[1], palette.ptRadius, 0, 2*Math.PI, false)
	//this.ctx.lineWidth = palette.ptPen
	//this.ctx.strokeStyle = palette.ptStroke
	//this.ctx.fillStyle = palette.ptFill
	//if (palette.ptStroke) this.ctx.stroke()
	//if (palette.ptFill) this.ctx.fill()
	//this.ctx.beginPath()
	return true
}
voyc.GeoIteratorClip.prototype.findTangent = function(ob,oc,ctr,r) {
	var dθ = oc.θ - ob.θ;
	var θ3 = ob.θ + dθ/2;
	var r3 = r/Math.cos(dθ/2);
	var x1 = ctr[0] + r3*Math.cos(θ3);
	var y1 = ctr[1] + r3*Math.sin(θ3);
	return [x1,y1];
}
voyc.GeoIteratorClip.prototype.extendToCircumference = function(pt,ctr,r) {
	// translate to 0,0
	var x1 = pt[0] - ctr[0];
	var y1 = pt[1] - ctr[1];

	var tanθ = y1/x1;
	var θ = Math.atan(tanθ);
	if (x1 < 0) { // if in Quadrant II or III
		θ += Math.PI;
	}
	var x = Math.cos(θ) * r;
	var y = Math.sin(θ) * r;
	
	
	// translate back to center
	x2 = x+ctr[0];
	y2 = y+ctr[1];
	return {θ:θ, pt:[x2,y2]};
}
voyc.GeoIteratorClip.prototype.arcGap = function(a,d,ctr,r) {
	// given two points, a center and radius
	// extend both points to the circumference, 
	// 	otherwise you get a thick mish-mash of lines around the edge
	// draw a line to the first point
	// then, arc to the second point
	ob = this.extendToCircumference(a,ctr,r);
	oc = this.extendToCircumference(d,ctr,r);
	var e = this.findTangent(ob, oc,ctr,r);
	this.ctx.lineTo(ob.pt[0],ob.pt[1]);
	this.ctx.arcTo(e[0],e[1],oc.pt[0],oc.pt[1],r);
}

// -------- Scale    qualify, group, and choose palette by scalerank

voyc.GeoIteratorScale = function() {
	voyc.GeoIteratorClip.call(this) // super
}
voyc.GeoIteratorScale.prototype = Object.create(voyc.GeoIteratorClip.prototype) // inherit

voyc.GeoIteratorScale.prototype.collectionStart = function(collection, add) {
	voyc.GeoIteratorClip.prototype.collectionStart.call(this,collection,add)
	this.scalerank = add[3]
	this.prevScaleRank = false
	return true
}

voyc.GeoIteratorScale.prototype.collectionEnd = function(collection) {
	this.draw(this.prevScaleRank)
}

voyc.GeoIteratorScale.prototype.geometryStart = function(geometry) {

	// two things happen in here: qualification and draw by scalerank
	if (this.palette.length <= 1)
		debugger;

	// qualify by scalerank
	if (geometry.scalerank > this.scalerank)
		return 0  // disqualified. skip this geom but keep going

	// draw in groups by scalerank
	if (this.prevScaleRank && (this.prevScaleRank != geometry.scalerank)) {
		this.draw(this.prevScaleRank)
		this.ctx.beginPath()
	}
	this.prevScaleRank = geometry.scalerank

	this.paletteNdx = this.calcPaletteIndex(this.scalerank, geometry.scalerank, this.palette.length)
	voyc.GeoIteratorClip.prototype.geometryStart.call(this,geometry)
	return true
}

voyc.GeoIteratorScale.prototype.calcPaletteIndex = function(zoomScaleRank, geomScaleRank, maxScaleRank) {
	var paletteNdx = 0
	if (geomScaleRank) {
		var adj = maxScaleRank - zoomScaleRank   // value 5-0
		var paletteLevel = geomScaleRank + adj  // 1-6
		var paletteNdx = paletteLevel - 1  // 0-5
	}
	return paletteNdx
}

voyc.GeoIteratorScale.prototype.draw = function(geomScaleRank) {
	var paletteNdx = this.calcPaletteIndex(this.scalerank, geomScaleRank, this.palette.length)
	voyc.GeoIteratorClip.prototype.draw.call(this,paletteNdx)
}

// -------- HitTest

voyc.GeoIteratorHitTest = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorHitTest.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorHitTest.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(['iterate hittest',collection.name])
	this.ret = false
	this.projection = add[0]
	this.mousept = add[1]
	this.time = add[2]
	this.scalerank = add[3]
	var size = 7
	this.mouserect = {
		w:this.mousept[0]-size,
		e:this.mousept[0]+size,
		n:this.mousept[1]-size,
		s:this.mousept[1]+size,
	}
	this.mouseco = this.projection.invert(this.mousept)
	this.ptPrev = false
	this.hits = []
	this.d = []
	return true
}

voyc.GeoIteratorHitTest.prototype.geometryStart = function(geometry) {
	// qualify by scalerank
	if (geometry.scalerank > this.scalerank)
		return 0  // disqualified. skip this geom but keep going

	if (!geometry.name) // don't hit anything that doesn't have a name, like grid lines
		return 0
	if (geometry.b)
		if ((geometry.b < this.time) && (this.time < geometry.e))
			;
		else
			return 0
	this.ptPrev = false
	return true 
}
voyc.GeoIteratorHitTest.prototype.lineStart = function(geometry) {
	this.ptPrev = false
	return true
}
voyc.GeoIteratorHitTest.prototype.geometryEnd = function(geometry) {
	if (this.ret) {
		this.d.sort()
		var d = this.d[0]
		this.hits.push({geom:geometry,d:d})
		this.ret = false
	}
}
voyc.GeoIteratorHitTest.prototype.collectionEnd = function() {
	var a = []
	for (var o of this.hits)
		a.push(o.geom.name)
	if (this.hits.length > 0) {
		this.hits.sort(function(a, b){return a.d - b.d})
		this.ret = this.hits[0].geom
	}
}

voyc.GeoIteratorHitTest.prototype.polygonStart = function(polygon) {
	var match = this.pointInPolygon(this.mouseco,polygon)
	if (match)
		this.ret = true
	return false
}

voyc.GeoIteratorHitTest.prototype.doPoint = function(co, within, ndx) {
	var pt = this.projection.project(co)
	//console.log(['co',co[0],co[1],'pt',pt[0],pt[1]])
	var boo = true
	var match = false
	if (pt) {
		if (within == 'point') 
			match = this.pointInRect(pt,this.mouserect)
	
		if (within == 'poly')
			; //never gets here, hit test done in polygonStart()
	
		if (within == 'line')
			if (this.ptPrev) {
				var d = voyc.distancePointToLineSeg(this.mousept,this.ptPrev,pt)
				if (d < 10) {
					this.d.push(d)
					match = true
				}
			}
			this.ptPrev = pt	
	}
	if (match)
		this.ret = true
	return true 
}
voyc.GeoIteratorHitTest.prototype.pointInPolygon= function(pt,poly) {
	var x = pt[0];
	var y = pt[1];
	var inside = false
	for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		if (((poly[i][1] > y) != (poly[j][1] > y)) && (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])) {
			inside = !inside;
		}
	}
	return inside;
},
voyc.GeoIteratorHitTest.prototype.pointInRect= function(pt,rect) {
	return(    (pt[0] > rect.w)
		&& (pt[0] < rect.e)
		&& (pt[1] > rect.n)
		&& (pt[1] < rect.s))
}

// -------- Animate

voyc.GeoIteratorAnimate = function() {
	voyc.GeoIteratorScale.call(this) // super
}
voyc.GeoIteratorAnimate.prototype = Object.create(voyc.GeoIteratorScale.prototype) // inherit

voyc.GeoIteratorAnimate.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(voyc.prepString('iterate draw $1',[collection.name]))
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.scalerank = add[3]
	this.offset = add[4]        // override
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	this.prevScaleRank = false
	return true
}

voyc.GeoIteratorAnimate.prototype.draw = function(geomScaleRank) {
	var paletteNdx = this.calcPaletteIndex(this.scalerank, geomScaleRank, this.palette.length)
	var palette = this.palette[paletteNdx]
	this.ctx.fillStyle = palette.pat || palette.fill
	this.ctx.lineWidth = palette.pen
	this.ctx.strokeStyle = 'rgb(176,176,255'    // override
	this.ctx.lineDashOffset = -this.offset      // override
	this.ctx.setLineDash([3,3])                 // override
	if (palette.fill) this.ctx.fill()
	if (palette.stroke) this.ctx.stroke()
}

// -------- Empire

voyc.GeoIteratorEmpire = function() {
	voyc.GeoIteratorScale.call(this) // super
}
voyc.GeoIteratorEmpire.prototype = Object.create(voyc.GeoIteratorScale.prototype) // inherit

voyc.GeoIteratorEmpire.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(voyc.prepString('iterate draw $1',[collection.name]))
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.timenow = add[3]
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	this.prevColor = false
	return true
}

voyc.GeoIteratorEmpire.prototype.collectionEnd = function(collection) {
	this.draw(this.prevColor)
}

voyc.GeoIteratorEmpire.prototype.geometryStart = function(geometry) {
	if (!geometry)
		return false  // kill the loop

	// qualify by time
	if ((geometry.b < this.timenow) && (this.timenow < geometry.e))
		;
	else
		return 0  // disqualified. skip this geom but keep going

	// draw in groups by color
	if (this.prevColor && (this.prevColor != geometry.c)) {
		this.draw(this.prevColor)
		this.ctx.beginPath()
	}
	this.prevColor = geometry.c
	return true
}

voyc.GeoIteratorEmpire.prototype.draw = function(prevColor) {
	var paletteNdx = prevColor-1
	var palette = this.palette[paletteNdx]
	if (!palette)
		debugger;
	this.ctx.fillStyle = palette.pat || palette.fill
	this.ctx.lineWidth = palette.pen
	if (palette.fill) this.ctx.fill()
	if (palette.stroke) this.ctx.stroke()
}

// -------- Sketch

voyc.GeoIteratorSketch = function() {
	voyc.GeoIteratorClip.call(this) // super
}
voyc.GeoIteratorSketch.prototype = Object.create(voyc.GeoIteratorClip.prototype) // inherit

voyc.GeoIteratorSketch.prototype.collectionStart = function(collection, add) {
	if (geolog) console.log(voyc.prepString('iterate draw $1',[collection.name]))
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.ptNext = add[3]
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	this.shape = false
	this.forcePoint = false
	return true
}
voyc.GeoIteratorSketch.prototype.geometryStart = function(geometry) {
	if (this.geometry.type.indexOf('Polygon')>-1)
		this.shape = 'poly'
	else if (this.geometry.type.indexOf('Line')>-1)
		this.shape = 'line'
	else {
		this.shape = 'point'
		if (this.geometry.type.indexOf('Point')<0)
			debugger;
	}
	return true
}

voyc.GeoIteratorSketch.prototype.geometryEnd = function(geometry) {
	if (this.ptNext)
		this.drawPoint(this.ptNext, '', -1)
}
voyc.GeoIteratorSketch.prototype.collectionEnd = function(collection) {
	// pass 1. draw lines and or polygon
	this.draw()
	
	// pass 2. draw points on top
	if (!this.forcePoint) {
		this.forcePoint = true
		this.iterateGeometry(this.geometry)
	}
}
voyc.GeoIteratorSketch.prototype.drawPoint = function(pt, within, ndx) {
	if (!pt)
		return

	if (!this.forcePoint)
		this.ctx.lineTo(pt[0],pt[1])
	else {
	var palette = this.palette[0]
	var radius = this.palette[0].ptRadius
	this.ctx.arc(pt[0],pt[1], radius, 0, 2*Math.PI, false)

	// choose fill based on ndx
	this.ctx.fillStyle = palette.ptFill		// default: black

	if (((this.shape == 'line') && (ndx == (this.line.length-1))) ||
			((this.shape == 'poly') && (ndx == (this.polygon.length[0]-1))))
		this.ctx.fillStyle = '#ff0000'		// last point:red stop

	if (ndx == 0 && this.shape != 'point')
		this.ctx.fillStyle = '#00ff00'		// first point: green go

	if (ndx >= 0)					// next point: hollow point
		this.ctx.fill()
	
	if (palette.ptStroke) {
		this.ctx.strokeStyle = palette.ptStroke
		this.ctx.lineWidth = palette.ptPen
		this.ctx.stroke()
	}
	this.ctx.beginPath()
}
}
voyc.GeoIteratorSketch.prototype.draw = function() {
	var palette = this.palette[0]
	if (this.shape == 'poly') {
		this.ctx.closePath()
		this.ctx.fillStyle = palette.pat || palette.fill
		this.ctx.fill()
		this.ctx.strokeStyle = palette.stroke
		this.ctx.lineWidth = palette.pen
		this.ctx.stroke()
	}
	else if (this.shape == 'line') {
		this.ctx.strokeStyle = palette.lnStroke
		this.ctx.lineWidth = palette.lnPen
		this.ctx.stroke()
	}
	this.ctx.beginPath()
}

// -------- Custom

voyc.GeoIteratorCustom = function() {
	voyc.GeoIteratorClip.call(this) // super
}
voyc.GeoIteratorCustom.prototype = Object.create(voyc.GeoIteratorClip.prototype) // inherit

voyc.GeoIteratorCustom.prototype.drawPoint = function(pt, within, ndx) {
	var palette = this.palette[0]
	this.ctx.arc(pt[0],pt[1], palette.ptRadius, 0, 2*Math.PI, false)
	this.ctx.lineWidth = palette.ptPen
	this.ctx.strokeStyle = palette.ptStroke
	this.ctx.fillStyle = palette.ptFill
	if (palette.ptStroke) this.ctx.stroke()
	if (palette.ptFill) this.ctx.fill()
	this.ctx.beginPath()
	return true
}

voyc.GeoIteratorCustom.prototype.lineEnd = function() {
	var palette = this.palette[0]
	this.ctx.lineWidth = palette.lnPen
	this.ctx.strokeStyle = palette.lnStroke
	if (palette.lnStroke) this.ctx.stroke()
	this.ctx.beginPath()
}

voyc.GeoIteratorCustom.prototype.polygonEnd = function(polygon) {
	voyc.GeoIteratorClip.prototype.polygonEnd.call(this)
	var palette = this.palette[0]
	this.ctx.lineWidth = palette.pen
	this.ctx.strokeStyle = palette.stroke
	this.ctx.fillStyle = palette.fill
	this.ctx.closePath()
	if (palette.stroke) this.ctx.stroke()
	if (palette.fill) this.ctx.fill()
	this.ctx.beginPath()
}

// -------- Hilite

voyc.GeoIteratorHilite = function() {
	voyc.GeoIteratorClip.call(this) // super
}
voyc.GeoIteratorHilite.prototype = Object.create(voyc.GeoIteratorClip.prototype) // inherit

voyc.GeoIteratorHilite.prototype.drawPoint = function(pt, within, ndx) {
	var palette = this.palette[0]
	this.ctx.moveTo(pt[0]+palette.ptRadius-1,pt[1]+palette.ptRadius-1)
	this.ctx.arc(pt[0],pt[1], palette.ptRadius, 0, 2*Math.PI, false)
	return true
}

