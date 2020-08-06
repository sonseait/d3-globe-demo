import * as React from "react";
interface GlobeProps {
    lines: number[][];
    /**
     * Default is 270
     */
    arcAngle?: number;
    rotation?: (r: {
        x?: number;
        y?: number;
        z?: number;
    }) => {
        x?: number;
        y?: number;
        z?: number;
    };
    mapImageUrl: string;
}
export declare class Globe extends React.PureComponent<GlobeProps> {
    private divRef;
    private camera;
    private scene;
    private renderer;
    private system;
    private earth;
    private flightsPointCloudGeometry;
    private flightsPathSplines;
    private segments;
    private points;
    private flightsStartTimes;
    private flightsEndTimes;
    componentDidMount(): void;
    private animate;
    private setupThree;
    private setupSystem;
    private setupEarth;
    private setFlightTimes;
    private setupFlightsPathSplines;
    private setupFlightsPathLines;
    private updateFlights;
    render(): JSX.Element;
}
export {};
