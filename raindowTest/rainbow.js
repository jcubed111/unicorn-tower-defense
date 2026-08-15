'use strict';

const fs = require('fs');
const path = require('path');

// --- Physical constants ---
const C = 299792458;          // speed of light, m/s
const H = 6.62607015e-34;     // Planck constant, J*s
const KB = 1.380649e-23;      // Boltzmann constant, J/K
const T_SUN = 5778;           // sun's effective surface temperature, K

// Rayleigh scattering strips blue light out of the direct solar beam on its
// way through the atmosphere -- the same mechanism that makes the sky blue
// and makes low sun look orange. Rainbows only ever appear with the sun
// below ~42 degrees elevation (the bow's own radius), so the beam actually
// reaching the drops is never the raw top-of-atmosphere spectrum; it's
// already been reddened by a real path through the air. 30 degrees is a
// middling, unremarkable elevation for a visible bow -- not a sunset-grazing
// extreme, just an ordinary low sun.
const RAYLEIGH_TAU_550NM = 0.1;   // sea-level Rayleigh optical depth at 550nm
const SUN_ELEVATION_DEG = 30;
const AIR_MASS = 1 / Math.sin((SUN_ELEVATION_DEG * Math.PI) / 180); // secant approximation

// Cauchy dispersion fit for water, n = A + B/lambda_um^2, calibrated to
// n(400nm)=1.343 / n(700nm)=1.331. Good enough for visible-light rendering.
const CAUCHY_A = 1.325183;
const CAUCHY_B = 0.0028505;

// Sweep exactly the range wavelengthToRGB() knows how to color. Wavelengths
// outside this are physically real but render as flat black regardless of
// intensity, which pins the sweep's edge samples to a fake plateau -- so
// straying past it doesn't buy a "fade to black," it buys a hard cutoff.
const WAVELENGTH_MIN_NM = 380;
const WAVELENGTH_MAX_NM = 780;
const WAVELENGTH_STEP_NM = 2;

function refractiveIndex(wavelengthNm) {
  const lambdaUm = wavelengthNm / 1000;
  return CAUCHY_A + CAUCHY_B / (lambdaUm * lambdaUm);
}

// Total deviation of a primary-bow ray (one internal reflection) as a
// function of impact parameter b = sin(i), i in [0, pi/2).
function deviation(b, n) {
  return Math.PI + 2 * Math.asin(b) - 4 * Math.asin(b / n);
}

function deviationDerivative(b, n) {
  const i = Math.asin(b);
  const r = Math.asin(b / n);
  return 2 / Math.cos(i) - 4 / (n * Math.cos(r));
}

// deviation(b) dips to a single minimum (the caustic / rainbow angle) as b
// sweeps 0..1. Locate it by bisecting on the derivative's sign change.
function findMinDeviationB(n) {
  let lo = 1e-6, hi = 1 - 1e-6;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    if (deviationDerivative(mid, n) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Bisect for b such that deviation(b, n) === targetD, restricted to a
// monotonic branch [lo, hi]. Returns null if targetD isn't reachable there.
function solveBOnBranch(targetD, n, lo, hi) {
  const f = (b) => deviation(b, n) - targetD;
  let flo = f(lo);
  const fhi = f(hi);
  if ((flo < 0) === (fhi < 0)) return null;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if ((fmid < 0) === (flo < 0)) { lo = mid; flo = fmid; }
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Unpolarized Fresnel reflectance for a ray crossing the air/water
// boundary at incidence angle i, refraction angle r.
function fresnelReflectance(i, r) {
  const rs = Math.sin(i - r) / Math.sin(i + r);
  const rt = Math.tan(i - r) / Math.tan(i + r);
  return 0.5 * (rs * rs + rt * rt);
}

// Planck's law spectral radiance, used as a stand-in for the sun's
// top-of-atmosphere spectrum -- before any Rayleigh extinction.
function solarSpectrum(wavelengthNm) {
  const lambda = wavelengthNm * 1e-9;
  const numerator = (2 * H * C * C) / Math.pow(lambda, 5);
  const denominator = Math.exp((H * C) / (lambda * KB * T_SUN)) - 1;
  return numerator / denominator;
}

// Beer-Lambert transmittance through the atmosphere's Rayleigh scattering,
// which falls off as 1/wavelength^4 -- short (blue) wavelengths get
// preferentially scattered out of the direct beam, long before it reaches
// any raindrop.
function atmosphericTransmittance(wavelengthNm) {
  const tau = RAYLEIGH_TAU_550NM * Math.pow(550 / wavelengthNm, 4);
  return Math.exp(-tau * AIR_MASS);
}

// Intensity contributed by a single wavelength at viewing angle theta
// (radians from the antisolar point), summed over both root branches of
// the primary-bow deviation curve. The 1/|dD/db| term is what makes this
// spike near each wavelength's own rainbow angle (the geometric-optics
// caustic); it's clamped rather than left to blow up, standing in for the
// finite peak real diffraction (Airy theory) would produce.
function intensityAtWavelength(theta, wavelengthNm) {
  const n = refractiveIndex(wavelengthNm);
  const targetD = Math.PI - theta;
  const b0 = findMinDeviationB(n);

  const roots = [
    solveBOnBranch(targetD, n, 1e-6, b0),
    solveBOnBranch(targetD, n, b0, 1 - 1e-6),
  ].filter((b) => b !== null);

  const incidentSpectrum = solarSpectrum(wavelengthNm) * atmosphericTransmittance(wavelengthNm);

  let intensity = 0;
  for (const b of roots) {
    const i = Math.asin(b);
    const r = Math.asin(b / n);
    const R = fresnelReflectance(i, r);
    const transmittance = (1 - R) * (1 - R) * R;
    const jacobian = Math.max(Math.abs(deviationDerivative(b, n)), 0.1);
    intensity += incidentSpectrum * (b / Math.sin(theta)) * transmittance / jacobian;
  }
  return intensity;
}

// Sweeps the visible spectrum and returns the [frequency, intensity] of
// whichever wavelength dominates at this viewing angle (degrees from the
// antisolar point) -- i.e. the wavelength whose own rainbow angle sits
// closest to this one, which is exactly what separates the bow into colors.
//
// Blending every sampled wavelength's color together (weighted by its own
// intensity) was tried and reverted: Bruton's wavelengthToRGB isn't a true
// CIE color-matching curve, so summing it broadly doesn't converge to white
// the way real spectral integration would -- its red channel is active over
// a much wider band (violet's tint plus the whole 620-780nm range) than
// blue or green, so any broad blend skews warm and drowns out blue. It's
// only well-behaved as a single-wavelength lookup, which is what this does.
function freqIntensityAtAngle(angleDeg) {
  const theta = (angleDeg * Math.PI) / 180;
  let bestFreq = 0;
  let bestIntensity = 0;

  for (let wavelengthNm = WAVELENGTH_MIN_NM; wavelengthNm <= WAVELENGTH_MAX_NM; wavelengthNm += WAVELENGTH_STEP_NM) {
    const intensity = intensityAtWavelength(theta, wavelengthNm);
    if (intensity > bestIntensity) {
      bestIntensity = intensity;
      bestFreq = C / (wavelengthNm * 1e-9);
    }
  }

  return [bestFreq, bestIntensity];
}

// Dan Bruton's wavelength -> RGB approximation of human color perception.
// Splits the hue (which primaries are active, gamma-corrected to 0-255)
// from the visibility factor (the falloff to black outside ~380-780nm, and
// the dimming right at those edges) instead of multiplying them together
// immediately -- factor is really an attenuation, i.e. an alpha, and
// collapsing it into the RGB magnitude only makes sense once you already
// know whether the caller is compositing with alpha or not.
function wavelengthToHueAndFactor(wavelengthNm) {
  let r = 0, g = 0, b = 0;

  if (wavelengthNm >= 380 && wavelengthNm < 440) {
    r = -(wavelengthNm - 440) / (440 - 380); g = 0; b = 1;
  } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
    r = 0; g = (wavelengthNm - 440) / (490 - 440); b = 1;
  } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
    r = 0; g = 1; b = -(wavelengthNm - 510) / (510 - 490);
  } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
    r = (wavelengthNm - 510) / (580 - 510); g = 1; b = 0;
  } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
    r = 1; g = -(wavelengthNm - 645) / (645 - 580); b = 0;
  } else if (wavelengthNm >= 645 && wavelengthNm <= 780) {
    r = 1; g = 0; b = 0;
  }

  let factor;
  if (wavelengthNm >= 380 && wavelengthNm < 420) {
    factor = 0.3 + (0.7 * (wavelengthNm - 380)) / (420 - 380);
  } else if (wavelengthNm >= 420 && wavelengthNm < 701) {
    factor = 1;
  } else if (wavelengthNm >= 701 && wavelengthNm <= 780) {
    factor = 0.3 + (0.7 * (780 - wavelengthNm)) / (780 - 700);
  } else {
    factor = 0;
  }

  const gamma = 0.8;
  const hue = (c) => (c === 0 ? 0 : Math.round(255 * Math.pow(c, gamma)));
  return { r: hue(r), g: hue(g), b: hue(b), factor: Math.pow(factor, gamma) };
}

// Opaque single-wavelength color: there's no alpha channel available on a
// terminal cell, so the visibility factor has to be collapsed into RGB
// magnitude here -- this is the one place that's actually correct to do.
function wavelengthToRGB(wavelengthNm) {
  const { r, g, b, factor } = wavelengthToHueAndFactor(wavelengthNm);
  return [Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)];
}

// Converts a [freq, intensity] sample to a CSS rgb() color, scaling
// perceived brightness by intensity relative to the brightest sample in
// whatever set this belongs to.
function freqIntensityToCssColor(freq, intensity, maxIntensity) {
  const wavelengthNm = (C / freq) * 1e9;
  const [r, g, b] = wavelengthToRGB(wavelengthNm);
  const brightness = maxIntensity > 0 ? Math.min(intensity / maxIntensity, 1) : 0;
  return `rgb(${Math.round(r * brightness)}, ${Math.round(g * brightness)}, ${Math.round(b * brightness)})`;
}

// Same idea, but for compositing over a page background instead of a
// terminal cell: dim samples fade toward transparent rather than toward
// black. RGB stays at full saturated hue at every stop; both the physical
// intensity at this angle and Bruton's edge-visibility factor are folded
// into alpha instead, since both are really "how much of this is actually
// there," not "what color is it."
function freqIntensityToRgbaColor(freq, intensity, maxIntensity) {
  const wavelengthNm = (C / freq) * 1e9;
  const { r, g, b, factor } = wavelengthToHueAndFactor(wavelengthNm);
  const brightness = maxIntensity > 0 ? Math.min(intensity / maxIntensity, 1) : 0;
  const alpha = brightness * factor;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(4)})`;
}

// Assumed angular field of view spanned by the page's farthest corner (the
// circle's default 100% radius), so the rainbow lands at a size proportional
// to a real one instead of being stretched to fill the screen. A real bow
// sits at ~40-43 degrees from the antisolar point; treating the far corner
// as 90 degrees of sky puts the band at a modest ~45-48% of the way out,
// roughly like looking up at a wide but plausible slice of sky.
const ASSUMED_FIELD_OF_VIEW_DEG = 90;

// Builds a CSS radial-gradient() from angle samples, one stop per sample
// (no thinning), positioned by real angle from the circle's center rather
// than by sample index -- so the circle's radius is a genuine angular
// scale, not just "0 to 100% of however big the div happens to be."
// Centering the circle at a corner (rather than the middle) is what
// actually matches the geometry -- a rainbow is a ring centered on the
// antisolar point, and putting that point off in a corner is what makes
// the visible slice read as an arc. A single transparent stop at the
// center (angle 0) stands in for the un-modeled sky between the antisolar
// point and where the real samples start.
function samplesToCssGradient(samples, maxIntensity) {
  const stops = samples.map(({ angle, freq, intensity }) => {
    const percent = (angle / ASSUMED_FIELD_OF_VIEW_DEG) * 100;
    const color = freqIntensityToRgbaColor(freq, intensity, maxIntensity);
    return `${color} ${percent.toFixed(4)}%`;
  });
  return `radial-gradient(circle at bottom left, rgba(0, 0, 0, 0) 0%, ${stops.join(', ')})`;
}

function main() {
  // 40.1 rather than violet's true peak (~40.5) or lower: below this, no
  // wavelength is close enough to its own caustic to have a real, robust
  // lead over the others, so "the dominant wavelength" stops being a
  // meaningful signal -- it's just picking whichever wavelength the
  // extinction-shaped background happens to favor by a hair (which is
  // violet without Rayleigh extinction applied, but shifts toward green
  // once it's added). That ambient sky glow is real, but this single-
  // dominant-wavelength model was never built to color it correctly, so
  // the window starts just past where a genuine caustic signal takes over.
  const startAngle = 40.1;
  const endAngle = 43.0;
  const steps = 140;

  const samples = [];
  let maxIntensity = 0;

  for (let s = 0; s <= steps; s++) {
    const angle = startAngle + ((endAngle - startAngle) * s) / steps;
    const [freq, intensity] = freqIntensityAtAngle(angle);
    samples.push({ angle, freq, intensity });
    if (intensity > maxIntensity) maxIntensity = intensity;
  }

  let line = '';
  for (const { freq, intensity } of samples) {
    const css = freqIntensityToCssColor(freq, intensity, maxIntensity);
    const [r, g, b] = css.match(/\d+/g).map(Number);
    line += `\x1b[48;2;${r};${g};${b}m  `;
  }
  line += '\x1b[0m';

  console.log(`Primary rainbow, ${startAngle}°-${endAngle}° from the antisolar point:\n`);
  console.log(line);

  const gradient = samplesToCssGradient(samples, maxIntensity);
  const cssPath = path.join(__dirname, 'rainbow-gradient.css');
  fs.writeFileSync(cssPath, `.rainbow {\n  background: ${gradient};\n}\n`);
  console.log(`\nWrote CSS gradient (${samples.length} stops) to ${cssPath}`);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Primary Rainbow</title>
<link rel="stylesheet" href="rainbow-gradient.css">
<style>
  html, body {
    margin: 0;
    height: 100%;
    background: #496172;
  }
  .rainbow {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>
  <div class="rainbow"></div>
</body>
</html>
`;
  const htmlPath = path.join(__dirname, 'rainbow.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`Wrote ${htmlPath}`);
}

main();
