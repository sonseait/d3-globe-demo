// Lat long to xyz coordinates
export function ll2xyz(latitude, longitude, radius) {
    var phi = ((90 - latitude) * Math.PI) / 180, theta = ((360 - longitude) * Math.PI) / 180;
    return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
    };
}
// Intermediate points on the spline curve
export function latlongTween(latitudeA, longitudeA, latitudeB, longitudeB, tween) {
    //  Convert degrees to radians.
    latitudeA *= Math.PI / 180;
    longitudeA *= Math.PI / 180;
    latitudeB *= Math.PI / 180;
    longitudeB *= Math.PI / 180;
    var d = 2 *
        Math.asin(Math.sqrt(Math.pow(Math.sin((latitudeA - latitudeB) / 2), 2) +
            Math.cos(latitudeA) *
                Math.cos(latitudeB) *
                Math.pow(Math.sin((longitudeA - longitudeB) / 2), 2))), A = Math.sin((1 - tween) * d) / Math.sin(d), B = Math.sin(tween * d) / Math.sin(d);
    //  Here’s our XYZ location for the tween Point. Sort of.
    //  (It doesn’t take into account the sphere’s radius.)
    //  It’s a necessary in between step that doesn’t fully
    //  resolve to usable XYZ coordinates.
    var x = A * Math.cos(latitudeA) * Math.cos(longitudeA) +
        B * Math.cos(latitudeB) * Math.cos(longitudeB), y = A * Math.cos(latitudeA) * Math.sin(longitudeA) +
        B * Math.cos(latitudeB) * Math.sin(longitudeB), z = A * Math.sin(latitudeA) + B * Math.sin(latitudeB);
    //  And we can convert that right back to lat / long.
    var latitude = (Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180) /
        Math.PI, longitude = (Math.atan2(y, x) * 180) / Math.PI;
    //  Return a nice package of useful values for our tween Point.
    return {
        latitude: latitude,
        longitude: longitude,
    };
}
//  Borrowed algorithm from http://www.movable-type.co.uk/scripts/latlong.html
//  Future enhancement would be to integrate with latlongtween.
export function latlongDistance(latitudeA, longitudeA, latitudeB, longitudeB) {
    var earthRadiusMeters = 6371000, φ1 = (latitudeA * Math.PI) / 180, φ2 = (latitudeB * Math.PI) / 180, Δφ = ((latitudeB - latitudeA) * Math.PI) / 180, Δλ = ((longitudeB - longitudeA) * Math.PI) / 180, a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2), c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), distanceMeters = earthRadiusMeters * c;
    return c;
}
export function easeOutQuadratic(currentTime, startValue, change, duration) {
    currentTime /= duration / 2;
    if (currentTime < 1)
        return (change / 2) * currentTime * currentTime + startValue;
    currentTime--;
    return (-change / 2) * (currentTime * (currentTime - 2) - 1) + startValue;
}
export function makeColorGradient(i, frequency, phase) {
    var center = 128;
    var width = 127;
    var redFrequency, grnFrequency, bluFrequency;
    grnFrequency = bluFrequency = redFrequency = frequency;
    var phase2 = phase + 2;
    var phase3 = phase + 4;
    var red = Math.sin(redFrequency * i + phase) * width + center;
    var green = Math.sin(grnFrequency * i + phase2) * width + center;
    var blue = Math.sin(bluFrequency * i + phase3) * width + center;
    return parseInt("0x" + _byte2Hex(red) + _byte2Hex(green) + _byte2Hex(blue));
}
export function _byte2Hex(n) {
    var nybHexString = "0123456789ABCDEF";
    return (String(nybHexString.substr((n >> 4) & 0x0f, 1)) +
        nybHexString.substr(n & 0x0f, 1));
}
