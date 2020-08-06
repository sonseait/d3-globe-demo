import * as React from "react";
import { Globe } from "threejs-globe";

export default class App extends React.PureComponent {
  render() {
    return (
      <div className="blur_bottom" style={{ height: 250, overflow: "hidden" }}>
        <div style={{ height: 600 }}>
          <Globe
            lines={[
              [33.2844, 77.3383, 1.2844, 210.532],
              [38.2844, 210.532, 18.2844, 320.3383],
            ]}
            mapImageUrl="map.png"
            arcAngle={270}
          />
        </div>
      </div>
    );
  }
}
