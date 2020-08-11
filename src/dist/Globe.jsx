import * as THREE from "three";
import * as React from "react";
import {
  latlongDistance,
  latlongTween,
  ll2xyz,
  easeOutQuadratic,
  createGradientGeometry,
} from "./utils/utils";
const { TrackballControls } = require("./utils/TrackballControls");

const TOTAL_SEGMENT = 64;
const START_POINT = 0.007;
const END_POINT = 0.993;

export class Globe extends React.PureComponent {
  constructor() {
    super(...arguments);
    this.divRef = React.createRef();
    this.flightsPathSplines = [];
    this.segments = new Float32Array(
      this.props.lines.length * 3 * 2 * TOTAL_SEGMENT
    );
    this.points = [];
    this.flightsStartTimes = [];
    this.flightsEndTimes = [];
    this.animate = () => {
      if (this.props.rotationAnimateAmount) {
        if (this.props.rotationAnimateAmount.x) {
          this.earth.rotation.x += this.props.rotationAnimateAmount.x;
        }
        if (this.props.rotationAnimateAmount.y) {
          this.earth.rotation.y += this.props.rotationAnimateAmount.y;
        }
        if (this.props.rotationAnimateAmount.z) {
          this.earth.rotation.z += this.props.rotationAnimateAmount.z;
        }
      }
      this.renderer.render(this.scene, this.camera);
      this.controls.update();
      this.updateFlights();
      requestAnimationFrame(this.animate);
    };

    this.setupThree = () => {
      const width = this.divRef.current.offsetWidth || window.innerWidth;
      var angle = 30,
        near = 0.01,
        far = 100;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clearDepth();
      this.renderer.setSize(width, width);
      this.divRef.current.appendChild(this.renderer.domElement);
      window.addEventListener("resize", this.onThreeResize, false);

      // Create and place the camera.
      this.camera = new THREE.PerspectiveCamera(angle, 1, near, far);
      this.camera.position.set(0, 0, 4.3);
      this.camera.updateProjectionMatrix();
      // Trackball controls for panning (click/touch and drag) and zooming (mouse wheel or gestures.)
      this.controls = new TrackballControls(
        this.camera,
        this.renderer.domElement
      );
      this.controls.noZoom = true;
      this.controls.noPan = true;
      this.controls.addEventListener("change", () => {
        this.renderer.render(this.scene, this.camera);
      });
      this.scene = new THREE.Scene();
    };

    this.onThreeResize = () => {
      const width = this.divRef.current.offsetWidth || window.innerWidth;
      this.renderer.setSize(width, width);
      this.controls.handleResize();
      this.renderer.render(this.scene, this.camera);
    };

    // Apply lighting to the system
    this.setupSystem = () => {
      this.system = new THREE.Object3D();
      this.system.name = "system";
      if (this.props.rotation) {
        const { x, y, z } = this.props.rotation(this.system.rotation);
        if (x) {
          this.system.rotation.x = x;
        }
        if (y) {
          this.system.rotation.y = y;
        }
        if (z) {
          this.system.rotation.z = z;
        }
      }
      this.scene.add(this.system);
    };
    //Mesh setup to model the Earth
    this.setupEarth = () => {
      this.earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshPhongMaterial({
          // map: THREE.ImageUtils.loadTexture(this.props.mapImageUrl),
          emissiveMap: THREE.ImageUtils.loadTexture(this.props.mapImageUrl),
          emissive: new THREE.Color(0xf8f9fa),
          // color: new THREE.Color(0xd1d1d1),
        })
      );
      this.earth.name = "earth";
      this.earth.castShadow = true;
      this.earth.receiveShadow = false;
      this.system.add(this.earth);
    };
    // Flights setup.
    this.setFlightTimes = (index) => {
      var flight = this.props.lines[index],
        distance = latlongDistance(flight[0], flight[1], flight[2], flight[3]),
        startTime = Date.now() + Math.floor(Math.random() * 1000 * 1),
        duration = Math.floor(distance * 1000 * 2);
      duration *= 0.8 + Math.random();
      this.flightsStartTimes[index] = startTime;
      this.flightsEndTimes[index] = startTime + duration;
    };
    // Compute skeletons of our flight paths.
    // We can then extrapolate more detailed flight path geometry later.
    this.setupFlightsPathSplines = () => {
      var f,
        originLatitude,
        originLongitude,
        destinationLatitude,
        destinationLongitude,
        distance,
        altitudeMax,
        points,
        pointLL,
        pointXYZ,
        p,
        arcAngle,
        arcRadius;
      for (f = 0; f < this.props.lines.length; f++) {
        originLatitude = this.props.lines[f][0];
        originLongitude = this.props.lines[f][1];
        destinationLatitude = this.props.lines[f][2];
        destinationLongitude = this.props.lines[f][3];
        // 	Altitude is set to make local flights fly at lower altitudes
        // and long haul flights fly at higher altitudes.
        distance = latlongDistance(
          originLatitude,
          originLongitude,
          destinationLatitude,
          destinationLongitude
        );
        altitudeMax = distance * 0.07;
        // We’re about to plot the path of this flight
        // using X number of points to generate a smooth-ish curve.
        points = [];
        for (p = 0; p < TOTAL_SEGMENT * 2 + 1; p++) {
          // Is our path shooting straight up? 0 degrees or straight down? 180 degree
          // Maybe in between
          arcAngle = (p * 180) / (TOTAL_SEGMENT * 2);
          // The radius is intended to be Earth’s radius.
          // Then we build a sine curve on top of that
          // with its max amplitude being ‘altitudeMax’.
          arcRadius = 1 + Math.sin((arcAngle * Math.PI) / 180) * altitudeMax;
          // So at this point in the flight (p) where are we between origin and destination?
          pointLL = latlongTween(
            originLatitude,
            originLongitude,
            destinationLatitude,
            destinationLongitude,
            p / (TOTAL_SEGMENT * 2)
          );
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
        const spline = new THREE.CatmullRomCurve3(points);
        this.flightsPathSplines.push(spline);
        this.setFlightTimes(f);
      }
    };
    // We’re going to draw arcs along the flight splines to show entire flight paths at a glance.
    // These lines are 2D, in that they do not scale according to zoom level.
    // This is very appealing because as you zoom out
    // they become more visually prevalent -- like seeing
    // the sum of the parts rather than the individual bits.
    // The opposite is true when you zoom in.
    this.setupFlightsPathLines = () => {
      this.flightsLineGeometry = new THREE.BufferGeometry();
      const colors = new Float32Array(
        this.props.lines.length * 3 * 2 * TOTAL_SEGMENT
      );
      const color = new THREE.Color();
      var material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
      });
      //   Calculate where segment starts and ends.
      //   Color is set accordingly
      for (
        let flightIndex = 0;
        flightIndex < this.props.lines.length;
        flightIndex++
      ) {
        for (
          let segmentIndex = 0;
          segmentIndex < TOTAL_SEGMENT;
          segmentIndex++
        ) {
          const index = (flightIndex * TOTAL_SEGMENT + segmentIndex) * 6;
          const beginsAtNormal = segmentIndex / (TOTAL_SEGMENT - 1);
          const endsAtNormal = (segmentIndex + 1) / (TOTAL_SEGMENT - 1);
          // Begin this line segment.
          const segmentBeginsAt = this.flightsPathSplines[flightIndex].getPoint(
            0
          );
          this.segments[index + 0] = segmentBeginsAt.x;
          this.segments[index + 1] = segmentBeginsAt.y;
          this.segments[index + 2] = segmentBeginsAt.z;
          color.setHSL(
            ((this.props.lines[flightIndex][1] + 100) % 360) / 360,
            1,
            0.3 + beginsAtNormal * 0.2
          );
          colors[index + 0] = color.r;
          colors[index + 1] = color.g;
          colors[index + 2] = color.b;
          // End this line segment.
          const segmentEndsAt = this.flightsPathSplines[flightIndex].getPoint(
            0
          );
          this.segments[index + 3] = segmentEndsAt.x;
          this.segments[index + 4] = segmentEndsAt.y;
          this.segments[index + 5] = segmentEndsAt.z;
          color.setHSL(
            ((this.props.lines[flightIndex][1] + 100) % 360) / 360,
            1,
            0.3 + endsAtNormal * 0.2
          );
          colors[index + 3] = color.r;
          colors[index + 4] = color.g;
          colors[index + 5] = color.b;
        }
        const point1Value = this.flightsPathSplines[flightIndex].getPoint(0);
        const point1 = new THREE.Mesh(
          new THREE.SphereGeometry(0.003, 15, 15),
          createGradientGeometry(
            new THREE.Color(0xda4453),
            new THREE.Color(0x89216b)
          )
        );
        point1.position.set(point1Value.x, point1Value.y, point1Value.z);
        this.points.push(point1);

        const point2Value = this.flightsPathSplines[flightIndex].getPoint(1);
        const point2 = new THREE.Mesh(
          new THREE.SphereGeometry(0.003, 15, 15),
          createGradientGeometry(
            new THREE.Color(0x00b4db),
            new THREE.Color(0x0083b0)
          )
        );
        point2.position.set(point2Value.x, point2Value.y, point2Value.z);
        this.points.push(point2);
      }
      this.flightsLineGeometry.addAttribute(
        "position",
        new THREE.BufferAttribute(this.segments, 3)
      );
      this.flightsLineGeometry.addAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );
      // Pack into the global varaible which is added to the scene later
      const flightsPathLines = new THREE.Line(
        this.flightsLineGeometry,
        material,
        THREE.LinePieces
      );
      this.earth.add(flightsPathLines);
      this.points.forEach((point) => {
        this.earth.add(point);
      });
    };
    this.updateFlights = () => {
      var f, easedValue, s, index, segmentBeginsAt, segmentEndsAt;
      for (f = 0; f < this.props.lines.length; f++) {
        if (Date.now() > this.flightsStartTimes[f]) {
          easedValue = easeOutQuadratic(
            Date.now() - this.flightsStartTimes[f],
            0,
            1,
            this.flightsEndTimes[f] - this.flightsStartTimes[f]
          );
          if (easedValue < 0 || isNaN(easedValue)) {
            easedValue = 0;
            this.setFlightTimes(f);
          }
          // đảo chiều
          let isReverse =
            Date.now() - this.flightsStartTimes[f] >
            this.flightsEndTimes[f] - this.flightsStartTimes[f];
          for (s = TOTAL_SEGMENT - 1; s >= 0; s--) {
            index = (f * TOTAL_SEGMENT + s) * 6;
            let beginsAtNormal;
            let endsAtNormal;
            if (isReverse) {
              beginsAtNormal = 1 - easedValue + s / (TOTAL_SEGMENT - 1);
              endsAtNormal = 1 - easedValue + (s - 1) / (TOTAL_SEGMENT - 1);
            } else {
              beginsAtNormal = easedValue - s / (TOTAL_SEGMENT - 1);
              endsAtNormal = easedValue - (s - 1) / (TOTAL_SEGMENT - 1);
            }
            // Begin this line segment.
            segmentBeginsAt = this.flightsPathSplines[f].getPoint(
              Math.min(Math.max(beginsAtNormal, START_POINT), END_POINT)
            );
            this.segments[index + 0] = segmentBeginsAt.x;
            this.segments[index + 1] = segmentBeginsAt.y;
            this.segments[index + 2] = segmentBeginsAt.z;
            // End this line segment.
            segmentEndsAt = this.flightsPathSplines[f].getPoint(
              Math.min(Math.max(endsAtNormal, START_POINT), END_POINT)
            );
            this.segments[index + 3] = segmentEndsAt.x;
            this.segments[index + 4] = segmentEndsAt.y;
            this.segments[index + 5] = segmentEndsAt.z;
          }
        }
      }
      this.flightsLineGeometry.computeBoundingSphere();
      this.flightsLineGeometry.attributes.position.needsUpdate = true;
    };
  }
  componentDidMount() {
    this.setupThree();
    this.setupSystem();
    this.setupEarth();
    this.setupFlightsPathSplines();
    this.setupFlightsPathLines();
    this.animate();
  }
  render() {
    return <div ref={this.divRef} />;
  }
}
