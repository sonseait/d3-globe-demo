var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as THREE from "three";
import * as React from "react";
import { latlongDistance, latlongTween, ll2xyz, easeOutQuadratic, } from "./utils/utils";
var segmentsTotal = 256;
var Globe = /** @class */ (function (_super) {
    __extends(Globe, _super);
    function Globe() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.divRef = React.createRef();
        _this.flightsPathSplines = [];
        _this.segments = new Float32Array(_this.props.lines.length * 3 * 2 * segmentsTotal);
        _this.points = [];
        _this.flightsStartTimes = [];
        _this.flightsEndTimes = [];
        _this.animate = function () {
            _this.earth.rotation.y -= 0.005;
            _this.renderer.render(_this.scene, _this.camera);
            // this.controls.update();
            _this.updateFlights();
            requestAnimationFrame(_this.animate);
        };
        _this.setupThree = function () {
            var width = _this.divRef.current.offsetWidth || window.innerWidth;
            var height = _this.divRef.current.offsetHeight || window.innerHeight;
            var angle = 30, near = 0.01, far = 100;
            _this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            _this.renderer.setClearColor(0x000000, 0);
            _this.renderer.setSize(width, height);
            _this.divRef.current.appendChild(_this.renderer.domElement);
            // Create and place the camera.
            _this.camera = new THREE.PerspectiveCamera(angle, width / height, near, far);
            _this.camera.position.set(0, 0, 4);
            // Trackball controls for panning (click/touch and drag) and zooming (mouse wheel or gestures.)
            // this.controls = new TrackballControls(
            //   this.camera,
            //   this.renderer.domElement
            // );
            // this.controls.enabled = false;
            // this.controls.dynamicDampingFactor = 0.2;
            // this.controls.addEventListener("change", () => {
            //   this.renderer.render(this.scene, this.camera);
            // });
            _this.scene = new THREE.Scene();
        };
        // Apply lighting to the system
        _this.setupSystem = function () {
            _this.system = new THREE.Object3D();
            _this.system.name = "system";
            if (_this.props.rotation) {
                var _a = _this.props.rotation(_this.system.rotation), x = _a.x, y = _a.y, z = _a.z;
                if (x) {
                    _this.system.rotation.x = x;
                }
                if (y) {
                    _this.system.rotation.y = y;
                }
                if (z) {
                    _this.system.rotation.z = z;
                }
            }
            _this.scene.add(_this.system);
        };
        //Mesh setup to model the Earth
        _this.setupEarth = function (radius) {
            if (radius === void 0) { radius = 1; }
            _this.earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 128), new THREE.MeshPhongMaterial({
                map: THREE.ImageUtils.loadTexture(_this.props.mapImageUrl),
                emissive: new THREE.Color(0xd1d1d1),
                transparent: true,
            }));
            _this.earth.name = "earth";
            _this.earth.castShadow = true;
            _this.earth.receiveShadow = false;
            _this.system.add(_this.earth);
        };
        // Flights setup.
        _this.setFlightTimes = function (index) {
            var flight = _this.props.lines[index], distance = latlongDistance(flight[0], flight[1], flight[2], flight[3]), startTime = Date.now() + Math.floor(Math.random() * 1000 * 1), duration = Math.floor(distance * 1000 * 2);
            duration *= 0.8 + Math.random();
            _this.flightsStartTimes[index] = startTime;
            _this.flightsEndTimes[index] = startTime + duration;
        };
        // Compute skeletons of our flight paths.
        // We can then extrapolate more detailed flight path geometry later.
        _this.setupFlightsPathSplines = function (radius) {
            if (radius === void 0) { radius = 1; }
            var f, originLatitude, originLongitude, destinationLatitude, destinationLongitude, distance, altitudeMax, pointsTotal, points, pointLL, pointXYZ, p, arcAngle, arcRadius;
            for (f = 0; f < _this.props.lines.length; f++) {
                originLatitude = _this.props.lines[f][0];
                originLongitude = _this.props.lines[f][1];
                destinationLatitude = _this.props.lines[f][2];
                destinationLongitude = _this.props.lines[f][3];
                // 	Altitude is set to make local flights fly at lower altitudes
                // and long haul flights fly at higher altitudes.
                distance = latlongDistance(originLatitude, originLongitude, destinationLatitude, destinationLongitude);
                altitudeMax = 0.02 + distance * 0.1;
                // We’re about to plot the path of this flight
                // using X number of points to generate a smooth-ish curve.
                pointsTotal = 256;
                points = [];
                for (p = 0; p < pointsTotal + 1; p++) {
                    // Is our path shooting straight up? 0 degrees or straight down? 180 degree
                    // Maybe in between
                    arcAngle = (p * (_this.props.arcAngle || 270)) / pointsTotal;
                    // The radius is intended to be Earth’s radius.
                    // Then we build a sine curve on top of that
                    // with its max amplitude being ‘altitudeMax’.
                    arcRadius = radius + Math.sin((arcAngle * Math.PI) / 180) * altitudeMax;
                    // So at this point in the flight (p) where are we between origin and destination?
                    pointLL = latlongTween(originLatitude, originLongitude, destinationLatitude, destinationLongitude, p / pointsTotal);
                    // Ok. Now we know where (in latitude / longitude)
                    // our flight is supposed to be at point ‘p’
                    // and we know what its altitude should be as well.
                    // Time to convert that into an actual XYZ location
                    // that will sit above our 3D globe.
                    pointXYZ = ll2xyz(pointLL.latitude, pointLL.longitude, arcRadius);
                    points.push(new THREE.Vector3(pointXYZ.x, pointXYZ.y, pointXYZ.z));
                }
                // Pack up this SplineCurve then push it into our global splines array.
                // Also set the flight time.
                var spline = new THREE.CatmullRomCurve3(points);
                _this.flightsPathSplines.push(spline);
                _this.setFlightTimes(f);
            }
        };
        // We’re going to draw arcs along the flight splines to show entire flight paths at a glance.
        // These lines are 2D, in that they do not scale according to zoom level.
        // This is very appealing because as you zoom out
        // they become more visually prevalent -- like seeing
        // the sum of the parts rather than the individual bits.
        // The opposite is true when you zoom in.
        _this.setupFlightsPathLines = function () {
            _this.flightsPointCloudGeometry = new THREE.BufferGeometry();
            var material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                vertexColors: THREE.VertexColors,
                transparent: true,
                opacity: 1,
                depthTest: true,
                depthWrite: false,
                linewidth: 2,
            }), segmentBeginsAt, segmentEndsAt, colors = new Float32Array(_this.props.lines.length * 3 * 2 * segmentsTotal), color = new THREE.Color(), index, beginsAtNormal, endsAtNormal;
            //   Calculate where segment starts and ends.
            //   Color is set accordingly
            for (var f = 0; f < _this.props.lines.length; f++) {
                for (var s = 0; s < segmentsTotal; s++) {
                    index = (f * segmentsTotal + s) * 6;
                    beginsAtNormal = s / (segmentsTotal - 1);
                    endsAtNormal = (s + 1) / (segmentsTotal - 1);
                    // Begin this line segment.
                    segmentBeginsAt = _this.flightsPathSplines[f].getPoint(0);
                    _this.segments[index + 0] = segmentBeginsAt.x;
                    _this.segments[index + 1] = segmentBeginsAt.y;
                    _this.segments[index + 2] = segmentBeginsAt.z;
                    color.setHSL(((_this.props.lines[f][1] + 100) % 360) / 360, 1, 0.3 + beginsAtNormal * 0.2);
                    colors[index + 0] = color.r;
                    colors[index + 1] = color.g;
                    colors[index + 2] = color.b;
                    // End this line segment.
                    segmentEndsAt = _this.flightsPathSplines[f].getPoint(0);
                    _this.segments[index + 3] = segmentEndsAt.x;
                    _this.segments[index + 4] = segmentEndsAt.y;
                    _this.segments[index + 5] = segmentEndsAt.z;
                    color.setHSL(((_this.props.lines[f][1] + 100) % 360) / 360, 1, 0.3 + endsAtNormal * 0.2);
                    colors[index + 3] = color.r;
                    colors[index + 4] = color.g;
                    colors[index + 5] = color.b;
                }
                var point1Value = _this.flightsPathSplines[f].getPoint(0);
                var point1 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.01, 64)), new THREE.LineBasicMaterial({
                    transparent: true,
                    opacity: 0.5,
                    color: 0xffffff,
                    linewidth: 1.5,
                }));
                point1.position.set(point1Value.x, point1Value.y, point1Value.z);
                point1.rotation.x = THREE.Math.degToRad(130);
                var point2Value = _this.flightsPathSplines[f].getPoint(1);
                var point2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.01, 64)), new THREE.LineBasicMaterial({
                    transparent: true,
                    opacity: 0.5,
                    color: 0xffffff,
                    linewidth: 1.5,
                }));
                point2.position.set(point2Value.x, point2Value.y, point2Value.z);
                point2.rotation.x = THREE.Math.degToRad(130);
                _this.points.push([point1, point2]);
            }
            _this.flightsPointCloudGeometry.addAttribute("position", new THREE.BufferAttribute(_this.segments, 3));
            _this.flightsPointCloudGeometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
            // Pack into the global varaible which is added to the scene later
            var flightsPathLines = new THREE.Line(_this.flightsPointCloudGeometry, material, THREE.LinePieces);
            _this.earth.add(flightsPathLines);
            _this.points.forEach(function (point) {
                _this.earth.add(point[0]);
                _this.earth.add(point[1]);
            });
        };
        _this.updateFlights = function () {
            var f, easedValue, s, index, segmentBeginsAt, segmentEndsAt;
            for (f = 0; f < _this.props.lines.length; f++) {
                if (Date.now() > _this.flightsStartTimes[f]) {
                    easedValue = easeOutQuadratic(Date.now() - _this.flightsStartTimes[f], 0, 1, _this.flightsEndTimes[f] - _this.flightsStartTimes[f]);
                    if (easedValue < 0 || isNaN(easedValue)) {
                        easedValue = 0;
                        _this.setFlightTimes(f);
                    }
                    // đảo chiều
                    var isReverse = Date.now() - _this.flightsStartTimes[f] >
                        _this.flightsEndTimes[f] - _this.flightsStartTimes[f];
                    for (s = segmentsTotal - 1; s >= 0; s--) {
                        index = (f * segmentsTotal + s) * 6;
                        var beginsAtNormal = void 0;
                        var endsAtNormal = void 0;
                        if (isReverse) {
                            beginsAtNormal = 1 - easedValue + s / (segmentsTotal - 1);
                            endsAtNormal = 1 - easedValue + (s - 1) / (segmentsTotal - 1);
                        }
                        else {
                            beginsAtNormal = easedValue - s / (segmentsTotal - 1);
                            endsAtNormal = easedValue - (s - 1) / (segmentsTotal - 1);
                        }
                        // Begin this line segment.
                        segmentBeginsAt = _this.flightsPathSplines[f].getPoint(Math.min(Math.max(beginsAtNormal, 0), 1));
                        _this.segments[index + 0] = segmentBeginsAt.x;
                        _this.segments[index + 1] = segmentBeginsAt.y;
                        _this.segments[index + 2] = segmentBeginsAt.z;
                        // End this line segment.
                        segmentEndsAt = _this.flightsPathSplines[f].getPoint(Math.min(Math.max(endsAtNormal, 0), 1));
                        _this.segments[index + 3] = segmentEndsAt.x;
                        _this.segments[index + 4] = segmentEndsAt.y;
                        _this.segments[index + 5] = segmentEndsAt.z;
                    }
                }
            }
            _this.flightsPointCloudGeometry.computeBoundingSphere();
            _this.flightsPointCloudGeometry.attributes
                .position.needsUpdate = true;
        };
        return _this;
    }
    Globe.prototype.componentDidMount = function () {
        this.setupThree();
        this.setupSystem();
        this.setupEarth();
        this.setupFlightsPathSplines();
        this.setupFlightsPathLines();
        this.animate();
    };
    Globe.prototype.render = function () {
        return React.createElement("div", { ref: this.divRef });
    };
    return Globe;
}(React.PureComponent));
export { Globe };
