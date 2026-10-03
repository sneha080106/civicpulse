// Runs an async task so that two runs never overlap, while collapsing a burst
// of callers into as few runs as possible.
//
//  - Idle: the call starts the task immediately.
//  - A run is in flight: the call is queued for ONE follow-up run that starts
//    after the current one ends. Every caller that arrives in the meantime
//    shares that single follow-up (it starts after all of them, so it sees all
//    of their data).
//
// Used for the priority recalculation: it is a full rebuild that deletes
// results absent from its own snapshot, so two overlapping rebuilds could
// delete each other's fresh results. Scope is a single Node process.
const createCoalescedRunner = (task) => {
  let running = null; // promise of the run in flight
  let queued = null;  // promise of the follow-up run that has not started yet

  const start = () => {
    const run = Promise.resolve().then(task);
    running = run;
    const clear = () => { if (running === run) running = null; };
    run.then(clear, clear);
    return run;
  };

  return () => {
    if (!running) return start();
    if (!queued) {
      queued = running
        .then(() => undefined, () => undefined) // a failed run must not block the follow-up
        .then(() => { queued = null; return start(); });
    }
    return queued;
  };
};

module.exports = { createCoalescedRunner };
