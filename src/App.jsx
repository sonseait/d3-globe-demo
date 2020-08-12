import * as React from "react";
import { Globe } from "./dist";

export default class App extends React.PureComponent {
  componentDidMount() {}

  render() {
    return (
      <div className="blur_bottom" style={{ height: 440, overflow: "hidden" }}>
        <div style={{ height: 600 }}>
          <Globe
            lines={[
              [38.2844, 210.532, 50.2844, 300.3383],
              [38.2844, 175.532, 50.2844, 300.3383],
              [35.2844, 250.3383, 38.2844, 319.3383],
              [40.2844, 60.3383, 55.2844, 110.532],
              [38.2844, 90.3383, 70.2844, 135.532],
              [55.2844, 338.3383, 45.2844, 60.3383],
            ]}
            mapImageUrl="map1.png"
            rotationAnimateAmount={{
              y: -0.002,
            }}
          />
        </div>
      </div>
    );
  }
}
