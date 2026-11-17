/**
 * Entry point of normalisierung.html: mounts the animation, the demos and all exercises.
 */
document.addEventListener('DOMContentLoaded', () => {
  new AnomalyDemo(document.getElementById('anomaly-demo'), LabData);
  new FdDetective(document.getElementById('fd-detective'), LabData);
  new NormAnimation(document.getElementById('norm-animation'), NormScenes, NormStages);
  Exercise.mountAll(document.getElementById('exercises'), NormExercises);
});
