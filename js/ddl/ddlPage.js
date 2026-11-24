/**
 * Entry point of ddl.html: mounts the animation, the labs, the sandbox and all exercises.
 */
document.addEventListener('DOMContentLoaded', () => {
  new DdlSteps(document.getElementById('ddl-steps'));
  new ConstraintLab(document.getElementById('constraint-lab'));
  new FkActionLab(document.getElementById('fk-lab'));
  new SqlSandbox(document.getElementById('sandbox'));
  Exercise.mountAll(document.getElementById('exercises'), DdlExercises);
});
