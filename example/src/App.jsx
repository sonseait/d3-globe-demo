import * as React from "react";
import { Globe } from "./dist";

export default class App extends React.PureComponent {
  render() {
    return (
      <div className="blur_bottom" style={{ height: 400, overflow: "hidden" }}>
        <div style={{ height: 600 }}>
          <Globe
            lines={[
              [33.2844, 77.3383, 1.2844, 210.532],
              [38.2844, 210.532, 18.2844, 320.3383],
            ]}
            mapImageUrl="map.png"
            arcAngle={270}
            rotationAnimateAmount={{
              y: -0.002,
            }}
          />
        </div>
      </div>
    );
  }
}
