/** Skip redundant GPU presentations on 90/120/144 Hz displays; never lower detail. */
export class PresentationBudget {
  private next = Number.NEGATIVE_INFINITY;
  constructor(private readonly interval = 1000 / 60) {}
  take(now: number, force = false): boolean {
    if (!force && now + .65 < this.next) return false;
    this.next = force || now - this.next > this.interval ? now + this.interval : this.next + this.interval;
    return true;
  }
}

const smooth = (a:number,b:number,x:number) => {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
};
/** Mirrors the glow-extraction shader for regression checks on white surfaces. */
export function glowMask(rgb:readonly number[],threshold=1.75,width=.6):number {
  const peak=Math.max(...rgb),low=Math.min(...rgb);
  const signal=Math.max(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114,peak*.72);
  const chroma=(peak-low)/Math.max(peak,.0001);
  return smooth(threshold,threshold+width,signal)*(.2+.8*smooth(.08,.35,chroma));
}

/** Bright coloured emitters bloom; the cake's cream and paper retain their contours. */
export const GLOW_EXTRACT_FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  float peak = max(max(texel.r, texel.g), texel.b);
  float low = min(min(texel.r, texel.g), texel.b);
  float signal = max(dot(texel.rgb, vec3(.299, .587, .114)), peak * .72);
  float chroma = (peak - low) / max(peak, .0001);
  float mask = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, signal);
  mask *= mix(.2, 1., smoothstep(.08, .35, chroma));
  gl_FragColor = mix(vec4(defaultColor, defaultOpacity), vec4(min(texel.rgb, vec3(6.)), texel.a), mask);
}`;
