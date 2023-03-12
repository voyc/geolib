/** 
	trig.js
	a set of utility functions for trigonometry
*/

voyc.dotProduct = function(x,y) {
	// dot product, aka Euclidean inner product
	// x and y are arrays of the same size
	var dot = 0
	for (var i=0; i<x.length; i++)
		dot += x[i] * y[i]
	return dot
}
voyc.norm = function(x) {
	// Euclidean norm, denoted ||x||, the square root of the dot product of an array with itself
	var norm = Math.sqrt(voyc.dotProduct(x,x))
	return norm 
}
voyc.length = function(A,B) {
	var xA = A[0]
	var yA = A[1]
	var xB = B[0]
	var yB = B[1]
	var length = Math.sqrt(Math.pow(yB - yA,2) + Math.pow(xB - xA,2))
	return length
}
voyc.slope = function(A,B) {
	// deltaY over deltaX, rise over run
	var xA = A[0]
	var yA = A[1]
	var xB = B[0]
	var yB = B[1]
	var m = (yB - yA) / (xB - xA)
	return m
}
voyc.slopePerpendicular = function(m) {
	// slope of a line perpendicular to the line with slope m
	// https://tutors.com/math-tutors/geometry-help/perpendicular-slope
	var mp = -1/m
	return mp
}
voyc.lineGivenTwoPoints = function(A,B) {
	// https://stackoverflow.com/questions/12132352/distance-from-a-point-to-a-line-segment#12132746
	// find equation of line AB
	// return a,b,c for normal form:  ax + by + c = 0
	// return m,i for slope-intercept form: y = mx + i
	var xA = A[0]
	var yA = A[1]
	var xB = B[0]
	var yB = B[1]
	var a = yA - yB
	var b = xB - xA
	var c = (xA * yB) - (xB * yA)
	var m = -a/b
	var i = -c/b
	return [a,b,c,m,i]
}
voyc.lineGivenSlopeAndOnePoint = function(m,A) {
	// https://www.mathsisfun.com/algebra/line-equation-point-slope.html
	// find equation of line AB
	// return a,b,c for normal form:  ax + by + c = 0
	// return m,i   for slope-intercept form: y = mx + i

	// y-y1 = m(x-x1)         // start with point-slope form
	// y = m(x-x1) + y1
	// y = mx - mx1 + y1
	// i = m*0 - m*x1 + y1    // substitute x=0 to find y-intercept

	var xA = A[0]
	var yA = A[1]
	var i = -m*xA + yA
	var xB = 0
	var yB = i
	var a = yA - yB
	var b = xB - xA
	var c = (xA * yB) - (xB * yA)
	return [a,b,c,m,i]
}
voyc.yNormalForm = function(x,a,b,c) {
	// find y given x and a normal form equation 
	// y = ax + by + c = 0
	// ax+by = -c
	// by = -c-ax
	// y = -c/b - ax/b 
	// y = -(a/b)x + -c/b
	return (0-(a/b))*x - c/b
}
voyc.ySlopeIntercept = function(x,m,i) {
	// find y given x and a slope-intercept equation
	return m*x + i
}

voyc.intersection = function(A,B,C) {
	// intersection point D of two perpendicular lines: AB and CD
	// given two line equations: https://byjus.com/point-of-intersection-formula/
	var xA = A[0]
	var yA = A[1]
	var xB = B[0]
	var yB = B[1]
	var xC = C[0]
	var yC = C[1]

	var AB = voyc.lineGivenTwoPoints(A,B)  // find equation for line AB
	var a1 = AB[0]
	var b1 = AB[1]
	var c1 = AB[2]
	var m1 = AB[3]
	var i1 = AB[4]
	
	var mp = voyc.slopePerpendicular(m1)  // find slope for line CD
	var CD = voyc.lineGivenSlopeAndOnePoint(mp,C) // find equation for line CD
	var a2 = CD[0]
	var b2 = CD[1]
	var c2 = CD[2]
	var m2 = CD[3]
	var i2 = CD[4]
	
	var x = (b1*c2 - b2*c1) / (a1*b2 - a2*b1) // find intersection based on the two equations
	var y = (a2*c1 - a1*c2) / (a1*b2 - a2*b1)
	return [x,y]
}
voyc.distancePointToLine = function(E, A,B) {
	// perpendicular distance from point E to line AB
	var xA = A[0]
	var yA = A[1]
	var xB = B[0]
	var yB = B[1]
	var xE = E[0]
	var yE = E[1]

	var line = voyc.lineGivenTwoPoints(A,B)
	var a = line[0]
	var b = line[1]
	var c = line[2]

	// using line equation
	// https://stackoverflow.com/questions/12132352/distance-from-a-point-to-a-line-segment#12132746
	// https://www.w3schools.blog/straight-lines-distance-of-a-point-from-a-line
	// derivation: https://www.cuemath.com/geometry/distance-of-a-point-from-a-line/
	var d1 = Math.abs(a*xE + b*yE + c) / Math.sqrt(a*a + b*b)

	// using two points
	// 
	var d2 = Math.abs(((xB-xA)*(yA-yE))-((xA-xE)*(yB-yA))) / Math.sqrt( Math.pow(xB-xA,2)+Math.pow(yB-yA,2))

	return d1
}
voyc.distancePointToLineSeg = function(E, A,B) {
	// https://math.stackexchange.com/questions/322831/determing-the-distance-from-a-line-segment-to-a-point-in-3-space
	// not used here: https://www.geeksforgeeks.org/minimum-distance-from-a-point-to-the-line-segment-using-vectors/
	var ans = false
	var m = voyc.slope(A,B)                    // find slope of line AB
	var line = voyc.lineGivenTwoPoints(A,B)    // find equation of line AB
	var a = line[0]
	var b = line[1]
	var c = line[2]
	var d = voyc.distancePointToLine(E, A,B)   // find distance d of point E to line AB
	var mp = voyc.slopePerpendicular(m)        // find slope of line perpendicular to AB
	var D = voyc.intersection(A,B,E)           // find intersection point D, on line AB perpendicular to point E
	var isInside = voyc.pointInRect(D,A,B)     // is D between A and B?
	if (isInside)                              // if so, 
		ans = d                            //    use d as answer
	else {                                     // if not
		var dae = voyc.length(A,E)         //     calc distance AE to endpoint
		var dbe = voyc.length(B,E)         //     calc distance BE to other endpoint
		ans = Math.min(dae,dbe)            //     use lesser of length AE and BE
	}
	return ans
}
voyc.pointInRect = function(C,A,B) {
	var l = A[0]
	var t = A[1]
	var r = B[0]
	var b = B[1]
	return(    (C[0] > l)
		&& (C[0] < r)
		&& (C[1] < t)
		&& (C[1] > b))
}
