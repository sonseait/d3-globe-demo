import * as THREE from "three";
import * as React from "react";
import { flights } from "./flights-base";
import {
  latlongDistance,
  latlongTween,
  ll2xyz,
  easeOutQuadratic,
} from "./utils/utils";
window.THREE = THREE;
require("three/examples/js/controls/TrackballControls.js");

const segmentsTotal = 128;

export default class App extends React.PureComponent {
  private divRef = React.createRef<HTMLDivElement>();

  private camera!: THREE.Camera;
  private scene!: THREE.Scene;
  private renderer!: THREE.Renderer;
  private controls!: THREE.TrackballControls;
  private system!: THREE.Object3D;
  private earth!: THREE.Mesh;
  private flightsPointCloudGeometry!: THREE.BufferGeometry;
  private flightsPathSplines: THREE.CatmullRomCurve3[] = [];
  private segments: Float32Array = new Float32Array(
    flights.length * 3 * 2 * segmentsTotal
  );
  private points: THREE.LineSegments[][] = [];
  private flightsStartTimes: number[] = [];
  private flightsEndTimes: number[] = [];

  componentDidMount() {
    this.setupThree();
    this.setupSystem();
    this.setupEarth();
    this.setupFlightsPathSplines();
    this.setupFlightsPathLines();

    this.system.rotation.z += (23.4 * Math.PI) / 180;
    this.system.rotation.x = Math.PI / 5;
    this.animate();
  }

  private animate = () => {
    this.earth.rotation.y += 0.002;
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    this.updateFlights();
    requestAnimationFrame(this.animate);
  };

  private setupThree = () => {
    const width = this.divRef.current!.offsetWidth || window.innerWidth;
    const height = this.divRef.current!.offsetHeight || window.innerHeight;

    var angle = 30,
      aspect = width / height,
      near = 0.01,
      far = 100;

    // Fire up the WebGL renderer.

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // this.renderer.setClearColor(0x000000, 1.0);
    this.renderer.setSize(width, height);
    // this.renderer.shadowMapEnabled = true;
    // this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
    this.divRef.current!.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onThreeResize, false);

    //  Create and place the camera.
    this.camera = new THREE.PerspectiveCamera(angle, aspect, near, far);
    this.camera.position.z = 5;

    //  Trackball controls for panning (click/touch and drag) and zooming (mouse wheel or gestures.)
    this.controls = new THREE.TrackballControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.dynamicDampingFactor = 0.2;
    this.controls.addEventListener("change", () => {
      this.renderer.render(this.scene, this.camera);
    });

    this.scene = new THREE.Scene();
  };

  //Resize
  private onThreeResize = () => {
    const width = this.divRef.current!.offsetWidth || window.innerWidth;
    const height = this.divRef.current!.offsetHeight || window.innerHeight;

    // this.camera.aspect = width / height;
    this.camera.updateMatrix();
    // this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    // this.controls.handleResize();
    this.renderer.render(this.scene, this.camera);
  };

  // Apply lighting to the system
  private setupSystem = () => {
    this.system = new THREE.Object3D();
    this.system.name = "system";
    this.scene.add(this.system);

    // Light color applied globally to make flight path visible.
    // Darker background. Fix to this
    this.scene.add(new THREE.AmbientLight(0x404040, 1));
  };

  //Mesh setup to model the Earth
  private setupEarth = (radius = 1) => {
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 32),
      new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture("earth.png"),
        bumpMap: THREE.ImageUtils.loadTexture("earth-bump.png"),
        bumpScale: 0.05,
        specularMap: THREE.ImageUtils.loadTexture("earth-specular.png"),
        specular: new THREE.Color(0xffffff),
        shininess: 4,
      })
    );

    this.earth.name = "earth";
    this.earth.castShadow = true;
    this.earth.receiveShadow = false;

    this.system.add(this.earth);
  };

  // Flights setup.
  private setFlightTimes = (index: number) => {
    var flight = flights[index],
      distance = latlongDistance(flight[0], flight[1], flight[2], flight[3]),
      startTime = Date.now() + Math.floor(Math.random() * 1000 * 20),
      duration = Math.floor(distance * 1000 * 2);

    //  Random used to give some variation.

    duration *= 0.8 + Math.random();
    this.flightsStartTimes[index] = startTime;
    this.flightsEndTimes[index] = startTime + duration;
  };

  //  Compute skeletons of our flight paths.
  //  We can then extrapolate more detailed flight path geometry later.
  private setupFlightsPathSplines = (radius = 1) => {
    var f,
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude,
      distance,
      altitudeMax,
      pointsTotal,
      points,
      pointLL,
      pointXYZ,
      p,
      arcAngle,
      arcRadius;

    for (f = 0; f < flights.length; f++) {
      originLatitude = flights[f][0];
      originLongitude = flights[f][1];
      destinationLatitude = flights[f][2];
      destinationLongitude = flights[f][3];

      // 	Altitude is set to make local flights fly at lower altitudes
      //  and long haul flights fly at higher altitudes.

      distance = latlongDistance(
        originLatitude,
        originLongitude,
        destinationLatitude,
        destinationLongitude
      );
      altitudeMax = 0.02 + distance * 0.1;

      //  We’re about to plot the path of this flight
      //  using X number of points to generate a smooth-ish curve.

      pointsTotal = 128;
      points = [];
      for (p = 0; p < pointsTotal + 1; p++) {
        //  Is our path shooting straight up? 0 degrees or straight down? 180 degree
        //  Maybe in between

        arcAngle = (p * 270) / pointsTotal;

        //  The radius is intended to be Earth’s radius.
        //  Then we build a sine curve on top of that
        //  with its max amplitude being ‘altitudeMax’.

        arcRadius = radius + Math.sin((arcAngle * Math.PI) / 180) * altitudeMax;

        //  So at this point in the flight (p) where are we between origin and destination?

        pointLL = latlongTween(
          originLatitude,
          originLongitude,
          destinationLatitude,
          destinationLongitude,
          p / pointsTotal
        );

        //  Ok. Now we know where (in latitude / longitude)
        //  our flight is supposed to be at point ‘p’
        //  and we know what its altitude should be as well.
        //  Time to convert that into an actual XYZ location
        //  that will sit above our 3D globe.
        pointXYZ = ll2xyz(pointLL.latitude, pointLL.longitude, arcRadius);
        points.push(new THREE.Vector3(pointXYZ.x, pointXYZ.y, pointXYZ.z));
      }

      //  Pack up this SplineCurve then push it into our global splines array.
      //  Also set the flight time.
      const spline = new THREE.CatmullRomCurve3(points);
      this.flightsPathSplines.push(spline);
      this.setFlightTimes(f);
    }
  };

  //  We’re going to draw arcs along the flight splines to show entire flight paths at a glance.
  //  These lines are 2D, in that they do not scale according to zoom level.
  //  This is very appealing because as you zoom out
  //  they become more visually prevalent -- like seeing
  //  the sum of the parts rather than the individual bits.
  //  The opposite is true when you zoom in.
  private setupFlightsPathLines = () => {
    this.flightsPointCloudGeometry = new THREE.BufferGeometry();

    var material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 1,
        depthTest: true,
        depthWrite: false,
        linewidth: 2,
      }),
      segmentBeginsAt,
      segmentEndsAt,
      colors = new Float32Array(flights.length * 3 * 2 * segmentsTotal),
      color = new THREE.Color(),
      index,
      beginsAtNormal,
      endsAtNormal;

    //   Calculate where segment starts and ends.
    //   Color is set accordingly
    for (let f = 0; f < flights.length; f++) {
      for (let s = 0; s < segmentsTotal; s++) {
        index = (f * segmentsTotal + s) * 6;
        beginsAtNormal = s / (segmentsTotal - 1);
        endsAtNormal = (s + 1) / (segmentsTotal - 1);

        //  Begin this line segment.
        segmentBeginsAt = this.flightsPathSplines[f].getPoint(0);
        this.segments[index + 0] = segmentBeginsAt.x;
        this.segments[index + 1] = segmentBeginsAt.y;
        this.segments[index + 2] = segmentBeginsAt.z;
        color.setHSL(
          ((flights[f][1] + 100) % 360) / 360,
          1,
          0.3 + beginsAtNormal * 0.2
        );
        colors[index + 0] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;

        //  End this line segment.
        segmentEndsAt = this.flightsPathSplines[f].getPoint(0);
        this.segments[index + 3] = segmentEndsAt.x;
        this.segments[index + 4] = segmentEndsAt.y;
        this.segments[index + 5] = segmentEndsAt.z;
        color.setHSL(
          ((flights[f][1] + 100) % 360) / 360,
          1,
          0.3 + endsAtNormal * 0.2
        );
        colors[index + 3] = color.r;
        colors[index + 4] = color.g;
        colors[index + 5] = color.b;
      }

      const point1Value = this.flightsPathSplines[f].getPoint(0);
      const point1 = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CircleGeometry(0.01, 64)),
        new THREE.LineBasicMaterial({
          transparent: true,
          opacity: 0.5,
          color: 0xffffff,
          linewidth: 1.5,
        })
      );
      point1.position.set(point1Value.x, point1Value.y, point1Value.z);
      point1.rotation.x = THREE.Math.degToRad(130);

      const point2Value = this.flightsPathSplines[f].getPoint(1);
      const point2 = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CircleGeometry(0.01, 64)),
        new THREE.LineBasicMaterial({
          transparent: true,
          opacity: 0.5,
          color: 0xffffff,
          linewidth: 1.5,
        })
      );
      point2.position.set(point2Value.x, point2Value.y, point2Value.z);
      point2.rotation.x = THREE.Math.degToRad(130);

      this.points.push([point1, point2]);
    }
    this.flightsPointCloudGeometry.addAttribute(
      "position",
      new THREE.BufferAttribute(this.segments, 3)
    );
    this.flightsPointCloudGeometry.addAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    //  Pack into the global varaible which is added to the scene later
    const flightsPathLines = new THREE.Line(
      this.flightsPointCloudGeometry,
      material,
      THREE.LinePieces
    );
    this.earth.add(flightsPathLines);

    this.points.forEach((point) => {
      this.earth.add(point[0]);
      this.earth.add(point[1]);
    });
  };

  private updateFlights = () => {
    var f, easedValue, s, index, segmentBeginsAt, segmentEndsAt;

    for (f = 0; f < flights.length; f++) {
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

        for (s = segmentsTotal - 1; s >= 0; s--) {
          index = (f * segmentsTotal + s) * 6;

          let beginsAtNormal: number;
          let endsAtNormal: number;

          if (isReverse) {
            beginsAtNormal = 1 - easedValue + s / (segmentsTotal - 1);
            endsAtNormal = 1 - easedValue + (s - 1) / (segmentsTotal - 1);
          } else {
            beginsAtNormal = easedValue - s / (segmentsTotal - 1);
            endsAtNormal = easedValue - (s - 1) / (segmentsTotal - 1);
          }

          //  Begin this line segment.

          segmentBeginsAt = this.flightsPathSplines[f].getPoint(
            Math.min(Math.max(beginsAtNormal, 0), 1)
          );
          this.segments[index + 0] = segmentBeginsAt.x;
          this.segments[index + 1] = segmentBeginsAt.y;
          this.segments[index + 2] = segmentBeginsAt.z;

          //  End this line segment.

          segmentEndsAt = this.flightsPathSplines[f].getPoint(
            Math.min(Math.max(endsAtNormal, 0), 1)
          );
          this.segments[index + 3] = segmentEndsAt.x;
          this.segments[index + 4] = segmentEndsAt.y;
          this.segments[index + 5] = segmentEndsAt.z;
        }
      }
    }
    this.flightsPointCloudGeometry.computeBoundingSphere();
    ((this.flightsPointCloudGeometry.attributes
      .position as unknown) as any).needsUpdate = true;
  };

  render() {
    return <div ref={this.divRef} />;
  }
}
