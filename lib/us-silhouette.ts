/**
 * Continental-US silhouette, derived from real geography (not hand-drawn): Census
 * Bureau TIGER/Line cartographic state boundaries (`us-atlas`'s `states-albers-10m`,
 * public domain), merged (Alaska/Hawaii excluded — continental only), simplified to
 * a single ~39-point outer ring (Douglas-Peucker + manual smoothing over the
 * Great Lakes / Delmarva regions for a clean stylized read rather than literal
 * coastline detail), and rescaled to fit this same "0 0 100 60" viewBox the app
 * already uses. See scripts/derive-map.mjs for the derivation.
 */
export const US_SILHOUETTE =
  "M77.6,44.7 L81.5,52.6 L81,56.7 L73.7,47 L65.6,46.2 L62.3,47.9 L63.3,50.2 L52.9,48.9 L48.3,57.2 " +
  "L45,55.9 L40.9,48.5 L37.1,49.8 L32.1,43.5 L23.6,43.3 L13.4,38.7 L8.4,32.9 L5.9,22.5 L10.3,2.6 " +
  "L12.4,6 L13.4,2.1 L34.7,6.5 L52.4,6.7 L60.4,9.2 L68.5,11.6 L64.8,22.6 L72.4,22.2 L81.3,16 " +
  "L82.5,12.5 L88.4,10.5 L89.4,5.3 L91.4,5.3 L94.3,9.7 L89.9,14.3 L91.8,17.7 L86.5,20.3 L89.2,19.6 " +
  "L84.7,29.4 L85.9,32.1 L85.4,33.8 Z";
