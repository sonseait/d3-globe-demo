export declare function ll2xyz(latitude: number, longitude: number, radius: number): {
    x: number;
    y: number;
    z: number;
};
export declare function latlongTween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number, tween: number): {
    latitude: number;
    longitude: number;
};
export declare function latlongDistance(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number;
export declare function easeOutQuadratic(currentTime: number, startValue: number, change: number, duration: number): number;
export declare function makeColorGradient(i: number, frequency: number, phase: number): number;
export declare function _byte2Hex(n: number): string;
